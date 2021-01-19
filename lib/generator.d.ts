/*! Copyright (c) 2021 Patrick Demian; Licensed under MIT */
import { IToken } from "chevrotain";
/**
 * List of regular expression dialects we support
 */
export declare enum RegexDialect {
    JS = 0,
    PCRE = 1,
    DotNet = 2,
    Java = 3,
    Python = 4,
    Boost = 5
}
/**
 * Interface for all semantic errors
 */
export interface ISemanticError {
    startLine: number;
    startColumn: number;
    length: number;
    message: string;
}
/**
 * Context for validation
 *
 * @remarks Currently only used to validate groups
 * @internal
 */
export declare class GeneratorContext {
    groups: {
        [key: string]: {
            startLine: number;
            startColumn: number;
            length: number;
        };
    };
    /**
     * Checks to see if we already have a group defined
     *
     * @param identifier the group name
     * @returns true if the group name already exists
     */
    hasGroup(identifier: string): boolean;
    /**
     * Adds the identifier to the group list
     *
     * @param identifier the group name
     */
    addGroup(identifier: string, tokens: IToken[]): void;
}
/**
 * Argument type: Just a plain object
 */
declare type GeneratorArguments = {
    [key: string]: string | boolean | number;
};
interface Generates {
    /**
     * Validate that this is both valid and can be generated in the specified language
     *
     * @remarks There is no guarantee toRegex will work unless validate returns no errors
     *
     * @param language the regex dialect we're validating
     * @param context the generator context
     * @returns A list of errors
     * @public
     */
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    /**
     * Generate a regular expression fragment based on this syntax tree
     *
     * @remarks There is no guarantee toRegex will work unless validate returns no errors
     *
     * @param language the regex dialect we're generating
     * @param args any additional arguments we may have
     * @returns a regular expression fragment
     * @public
     */
    toRegex(language: RegexDialect, args: GeneratorArguments | null): string;
}
/**
 * The base concrete syntax tree class
 *
 * @internal
 */
export declare abstract class H2RCST implements Generates {
    tokens: IToken[];
    /**
     * Constructor for H2RCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @internal
     */
    constructor(tokens: IToken[]);
    abstract validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    abstract toRegex(language: RegexDialect, args: GeneratorArguments | null): string;
    /**
     * Creates an ISemanticError with a given message and the tokens provided from the constructor
     *
     * @param message the message
     * @internal
     */
    protected error(message: string): ISemanticError;
}
/**
 * Flags for the using statement
 *
 * @internal
 */
export declare enum UsingFlags {
    Multiline,
    Global,
    Sensitive,
    Insensitive,
    Exact
}
/**
 * Type of match arguments
 *
 * @remarks SingleString means an escaped string
 * @remarks Between means a range (ex. a-z)
 * @remarks Anything means .
 * @remarks Word, Digit, Character, Whitespace, Number, Tab, Linefeed, Newline, and Carriage return are \w+, \d, \w, \s, \d+, \t, \n, \n, \r respectively
 * @internal
 */
export declare enum MatchSubStatementType {
    SingleString = 0,
    Between = 1,
    Anything = 2,
    Word = 3,
    Digit = 4,
    Character = 5,
    Whitespace = 6,
    Number = 7,
    Tab = 8,
    Linefeed = 9,
    Newline = 10,
    CarriageReturn = 11,
    Boundary = 12,
    Unicode = 13,
    Letter = 14,
    Decimal = 15,
    Integer = 16
}
/**
 * Container for match statements
 *
 * @internal
 */
export declare class MatchSubStatementValue {
    type: MatchSubStatementType;
    from: string | null;
    to: string | null;
    /**
     * Constructor for MatchSubStatementValue
     *
     * @param type the type of this match
     * @param from optional value or range string
     * @param to  optional range string
     * @internal
     */
    constructor(type: MatchSubStatementType, from?: string | null, to?: string | null);
}
/**
 * Container for MatchStatementValue
 *
 * @internal
 */
export declare class MatchStatementValue implements Generates {
    optional: boolean;
    statement: MatchSubStatementCST;
    /**
     * Constructor for MatchStatementValue
     *
     * @param optional is this match optional
     * @param statement the substatement to generate
     * @internal
     */
    constructor(optional: boolean, statement: MatchSubStatementCST);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect, args: GeneratorArguments | null): string;
}
/**
 * The base class for all statement concrete syntax trees
 *
 * @internal
 */
export declare abstract class StatementCST extends H2RCST {
}
/**
 * Concrete Syntax Tree for Match Sub statements
 *
 * @internal
 */
export declare class MatchSubStatementCST extends H2RCST {
    private count;
    private invert;
    private values;
    /**
     * Constructor for MatchSubStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param count optional count statement
     * @param invert is this match inverted (ex, [^a-z] or [a-z])
     * @param values sub statements to match
     */
    constructor(tokens: IToken[], count: CountSubStatementCST | null, invert: boolean, values: MatchSubStatementValue[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect, args: GeneratorArguments | null): string;
}
/**
 * Concrete Syntax Tree for Using statements
 *
 * @internal
 */
export declare class UsingStatementCST extends H2RCST {
    private flags;
    /**
     * Constructor for UsingStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param flags using flags
     */
    constructor(tokens: IToken[], flags: UsingFlags[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Concrete Syntax Tree for Count sub statements
 *
 * @internal
 */
export declare class CountSubStatementCST extends H2RCST {
    private from;
    private to;
    private opt;
    /**
     * Constructor for CountSubStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param from number to count from
     * @param to optional number to count to
     * @param opt option modifier
     */
    constructor(tokens: IToken[], from: number, to?: number | null, opt?: "inclusive" | "exclusive" | "+" | null);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect, args: GeneratorArguments | null): string;
}
/**
 * Concrete Syntax Tree for a Match statement
 *
 * @internal
 */
export declare class MatchStatementCST extends StatementCST {
    private completely_optional;
    private matches;
    /**
     * Constructor for MatchStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param matches the list of matches
     */
    constructor(tokens: IToken[], completely_optional: boolean, matches: MatchStatementValue[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Concrete Syntax Tree for a Repeat statement
 *
 * @internal
 */
export declare class RepeatStatementCST extends StatementCST {
    private optional;
    private count;
    private statements;
    /**
     * Constructor for RepeatStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param optional is this repetition optional
     * @param count optional number of times to repeat
     * @param statements the statements to repeat
     */
    constructor(tokens: IToken[], optional: boolean, count: CountSubStatementCST | null, statements: StatementCST[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Conrete Syntax Tree for a group Statement
 *
 * @internal
 */
export declare class GroupStatementCST extends StatementCST {
    private optional;
    private name;
    private statements;
    /**
     * Constructor for GroupStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param optional is this group optional
     * @param name optional name for named group
     * @param statements other statements
     * @internal
     */
    constructor(tokens: IToken[], optional: boolean, name: string | null, statements: StatementCST[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Concrete Syntax Tree for a Backreference statement
 *
 * @internal
 */
export declare class BackrefStatementCST extends StatementCST {
    private optional;
    private count;
    private name;
    /**
     * Constructor for BackrefStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param optional is this backref optional
     * @param count optional number of times to repeat
     * @param name the group name to call
     */
    constructor(tokens: IToken[], optional: boolean, count: CountSubStatementCST | null, name: string);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Concrete Syntax Tree for an If Pattern statement
 *
 * @internal
 */
export declare class IfPatternStatementCST extends StatementCST {
    private matches;
    private true_statements;
    private false_statements;
    /**
     * Constructor for IfPatternStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param matches list of matches to test against
     * @param true_statements true path
     * @param false_statements false path
     */
    constructor(tokens: IToken[], matches: MatchStatementValue[], true_statements: StatementCST[], false_statements: StatementCST[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Concrete Syntax Tree for an If group Ident statement
 *
 * @internal
 */
export declare class IfIdentStatementCST extends StatementCST {
    private identifier;
    private true_statements;
    private false_statements;
    /**
     * Constructor for IfIdentStatementCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param identifier the group identifier to check
     * @param true_statements true path
     * @param false_statements false path
     */
    constructor(tokens: IToken[], identifier: string, true_statements: StatementCST[], false_statements: StatementCST[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
/**
 * Concrete Syntax Tree for a regular expression
 *
 * @internal
 */
export declare class RegularExpressionCST extends H2RCST {
    private usings;
    private statements;
    /**
     * Constructor for RegularExpressionCST
     *
     * @param tokens Tokens used to calculate where an error occured
     * @param usings using statements
     * @param statements other statements
     * @internal
     */
    constructor(tokens: IToken[], usings: UsingStatementCST, statements: StatementCST[]);
    validate(language: RegexDialect, context: GeneratorContext): ISemanticError[];
    toRegex(language: RegexDialect): string;
}
export {};
