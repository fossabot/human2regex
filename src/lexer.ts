/*! Copyright (c) 2021 Patrick Demian; Licensed under MIT */

/**
 * The Lexer for Human2Regex
 * @packageDocumentation
 */

import { Lexer, IToken, createTokenInstance, ILexingError } from "chevrotain";
import { last, findLastIndex, CommonError } from "./utilities";
import { Indent, Outdent, EndOfLine, AllTokens } from "./tokens";

/**
 * Defines the type of indents the lexer will allow
 */
export enum IndentType {
    Tabs,
    Spaces,
    Both
}

/**
 * The options for the Lexer
 */
export class Human2RegexLexerOptions {

    /**
     * Constructor for the Human2RegexLexerOptions
     * 
     * @param skip_validations If true, the lexer will skip validations (~25% faster)
     * @param type The type of indents the lexer will allow
     * @param spaces_per_tab Number of spaces per tab
     */
    constructor(public skip_validations = false, public type: IndentType = IndentType.Both, public spaces_per_tab: number = 4) {
        /* empty */
    }
}

/**
 * Tokenization result
 */
export class TokenizeResult {

    /**
     * Constructor for the TokenizeResult
     * 
     * @param tokens The token stream
     * @param errors A list of lexing errors
     */
    public constructor(public tokens: IToken[], public errors: CommonError[]) {
        /* empty */
    }
}

/**
 * Human2Regex Lexer
 * 
 * @remarks Only 1 lexer instance allowed due to a technical limitation and performance reasons
 */
export class Human2RegexLexer {
    private static already_init = false;

    private lexer!: Lexer;
    private options!: Human2RegexLexerOptions;

    /**
     * Human2Regex Lexer
     * 
     * @remarks Only 1 lexer instance allowed due to a technical limitation and performance reasons
     * @param options options for the lexer
     * @see Human2RegexLexerOptions
     */
    constructor(options: Human2RegexLexerOptions = new Human2RegexLexerOptions()) {
        if (Human2RegexLexer.already_init) {
            throw new Error("Only 1 instance of Human2RegexLexer allowed");
        }

        Human2RegexLexer.already_init = true;

        this.setOptions(options);
    }

    /**
     * Sets the options for this lexer
     * 
     * @param options options for the lexer
     * @see Human2RegexLexerOptions
     */
    public setOptions(options: Human2RegexLexerOptions): void {
        this.options = options;

        let indent_regex: RegExp | null = null;

        // Generate an index lexer (accepts tabs or spaces or both based on options)
        if (this.options.type === IndentType.Tabs) {
            indent_regex = /\t/y;
        }
        else {
            let reg = ` {${this.options.spaces_per_tab}}`;

            if (this.options.type === IndentType.Both) {
                reg += "|\\t";
            }

            indent_regex = new RegExp(reg, "y");
        }

        Indent.PATTERN = indent_regex;

        this.lexer = new Lexer(AllTokens, { ensureOptimizations: true, skipValidations: options.skip_validations });
    }

    private lexError(token: IToken): ILexingError {
        return { 
            offset: token.startOffset,
            line: token.startLine ?? NaN,
            column: token.startColumn ?? NaN,
            length: token.endOffset ?? NaN - token.startOffset,
            message: "Unexpected indentation found"
        };
    }

    /**
     * Tokenizes the given text
     * 
     * @param text the text to analyze
     * @returns a tokenize result which contains the token stream and error list
     * @public
     */
    public tokenize(text: string): TokenizeResult {
        const lex_result = this.lexer.tokenize(text);

        if (lex_result.tokens.length === 0) {
            return new TokenizeResult(lex_result.tokens, lex_result.errors.map(CommonError.fromLexError));
        }

        const tokens: IToken[] = [];
        const indent_stack = [ 0 ];

        let curr_indent_level = 0;
        let start_of_line = true;
        let had_indents = false;

        // create Outdents
        for (let i = 0; i < lex_result.tokens.length; i++) {

            // EoL? check for indents next (by setting startOfLine = true)
            if (lex_result.tokens[i].tokenType === EndOfLine) {
                if (tokens.length === 0 || tokens[tokens.length-1].tokenType === EndOfLine) {
                    // Ignore multiple EOLs and ignore first EOL
                }
                else {
                    start_of_line = true;
                    tokens.push(lex_result.tokens[i]);
                }
            }
            // start with 1 indent. Append all other indents 
            else if (lex_result.tokens[i].tokenType === Indent) {
                had_indents = true;
                curr_indent_level = 1; 

                const start_token = lex_result.tokens[i];
                let length = lex_result.tokens[i].image.length;

                // grab all the indents (and their length)
                while (lex_result.tokens.length > i+1 && lex_result.tokens[i+1].tokenType === Indent) {
                    curr_indent_level++;
                    i++;
                    length += lex_result.tokens[i].image.length;
                }

                start_token.endOffset = start_token.startOffset + length;
                start_token.endColumn = lex_result.tokens[i].endColumn;
                // must be the same line
                //start_token.endLine = lex_result.tokens[i].endLine;

                // are we an empty line? 
                if (lex_result.tokens.length > i+1 && lex_result.tokens[i+1].tokenType === EndOfLine) {
                    // Ignore all indents AND newline
                    // continue;
                }
                // new indent is too far ahead
                else if (!start_of_line || (curr_indent_level > last(indent_stack) + 1)) {
                    lex_result.errors.push(this.lexError(start_token));
                }
                // new indent is just 1 above
                else if (curr_indent_level > last(indent_stack)) {
                    indent_stack.push(curr_indent_level);
                    tokens.push(start_token);
                }
                // new indent is below the past indent
                else if (curr_indent_level < last(indent_stack)) {
                    const index = findLastIndex(indent_stack, curr_indent_level);

                    // this will never happen since earlier up we exclude when you're too far ahead
                    // you have to go in order, 1 by 1, thus you can never not be in the indent stack
                    //if (index < 0) {
                    //    lex_result.errors.push(this.lexError(start_token));
                    //    continue;
                    //}
                    const number_of_dedents = indent_stack.length - index - 1;
                
                    for (let j = 0; j < number_of_dedents; j++) {
                        indent_stack.pop();
                        tokens.push(createTokenInstance(Outdent, "", start_token.startOffset, start_token.startOffset + length, start_token.startLine ?? NaN, start_token.endLine ?? NaN, start_token.startColumn ?? NaN, (start_token.startColumn ?? NaN) + length));
                    }
                }
                else {
                    // same indent level: don't care
                    // continue;
                }
            }
            else {
                if (start_of_line && !had_indents) {
                    const tok = lex_result.tokens[i];

                    //add remaining Outdents
                    while (indent_stack.length > 1) {
                        indent_stack.pop();
                        tokens.push(createTokenInstance(Outdent, "", tok.startOffset, tok.startOffset, tok.startLine ?? NaN, NaN, tok.startColumn ?? NaN, NaN));
                    }
                }
                start_of_line = false;
                had_indents = false;
                tokens.push(lex_result.tokens[i]);
            }
        }

        const tok = last(tokens);

        // Do we have an EOL marker at the end?
        if (tokens.length > 0 && tok.tokenType !== EndOfLine) {
            tokens.push(createTokenInstance(EndOfLine, "\n", tok.endOffset ?? NaN, tok.endOffset ?? NaN, tok.startLine ?? NaN, NaN, tok.startColumn ?? NaN, NaN)); 
        }
    
        //add remaining Outdents
        while (indent_stack.length > 1) {
            indent_stack.pop();
            tokens.push(createTokenInstance(Outdent, "", tok.endOffset ?? NaN, tok.endOffset ?? NaN, tok.startLine ?? NaN, NaN, tok.startColumn ?? NaN, NaN));
        }

        return new TokenizeResult(tokens, lex_result.errors.map(CommonError.fromLexError));
    }
}