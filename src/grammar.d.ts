// AUTOGENERATED FILE
// This file was generated from grammar.ohm by `ohm generateBundles`.

import {
  ActionDict,
  Grammar,
  IterationNode,
  Node,
  NonterminalNode,
  Semantics,
  TerminalNode
} from 'ohm-js';

export interface StorymaticActionDict<T> extends ActionDict<T> {
  Script?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  WrappedStatementBlock?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  StatementBlock_statements?: (this: NonterminalNode, arg0: IterationNode) => T;
  StatementBlock?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  SingleStatementBlock_single_statement?: (this: NonterminalNode, arg0: Node, arg1: IterationNode, arg2: NonterminalNode) => T;
  SingleStatementBlock?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  UnprefixedSingleStatementBlock_single_statement?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  UnprefixedSingleStatementBlock?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  IfStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode, arg4: IterationNode, arg5: IterationNode) => T;
  ElseIfStatement?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  ElseStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  thenOrDo?: (this: NonterminalNode, arg0: TerminalNode) => T;
  ElseIfKeyword_else_if?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode) => T;
  ElseIfKeyword_else_unless?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  ElseIfKeyword_elif?: (this: NonterminalNode, arg0: TerminalNode) => T;
  ElseIfKeyword?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  SwitchStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: IterationNode, arg5: IterationNode, arg6: TerminalNode) => T;
  CaseClause?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  CaseStatement?: (this: NonterminalNode, arg0: IterationNode, arg1: NonterminalNode) => T;
  DefaultStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  CaseTerminator_terminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  CaseTerminator_final?: (this: NonterminalNode, arg0: TerminalNode) => T;
  CaseTerminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TryStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: IterationNode) => T;
  CatchStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: NonterminalNode) => T;
  FinallyStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  EnumStatement?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: IterationNode, arg5: TerminalNode) => T;
  EnumMember_auto_assign?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  EnumMember_assigned?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  EnumMember?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Statement_expression?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  Statement_print?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_throw?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_repeat?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_while?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_until?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_do_while?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_do_until?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_for_in?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_for_of?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_for_await_of?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: NonterminalNode, arg5: IterationNode, arg6: TerminalNode, arg7: IterationNode, arg8: NonterminalNode, arg9: NonterminalNode) => T;
  Statement_for_range?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: IterationNode, arg7: IterationNode, arg8: IterationNode, arg9: IterationNode, arg10: IterationNode, arg11: IterationNode, arg12: IterationNode, arg13: IterationNode, arg14: IterationNode, arg15: IterationNode, arg16: IterationNode, arg17: NonterminalNode) => T;
  Statement_break?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Statement_continue?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Statement_return?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_await_new_thread?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: IterationNode, arg3: IterationNode, arg4: NonterminalNode, arg5: NonterminalNode) => T;
  Statement_when_callback?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: IterationNode, arg7: NonterminalNode) => T;
  Statement_empty_import?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_import?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_import_all?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: TerminalNode, arg3: IterationNode, arg4: NonterminalNode, arg5: IterationNode, arg6: TerminalNode, arg7: IterationNode, arg8: NonterminalNode, arg9: NonterminalNode) => T;
  Statement_import_default?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_empty_export?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Statement_export_from?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  Statement_export_all_from?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: TerminalNode, arg3: IterationNode, arg4: NonterminalNode, arg5: NonterminalNode) => T;
  Statement_export?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_export_default?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_export_class?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  Statement_export_variable?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_export_function?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  Statement_export_type?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  Statement_export_interface?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  Statement_export_enum?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  Statement_rescope?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_rescope_assign?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  Statement_typed_assignment?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Statement?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ClassDeclaration?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: IterationNode, arg7: TerminalNode, arg8: IterationNode, arg9: TerminalNode) => T;
  ClassElement_method?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ClassElement_static_method?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ClassElement_property?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  ClassElement_static_property?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  ClassElement?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  importLocation_filename?: (this: NonterminalNode, arg0: IterationNode, arg1: NonterminalNode) => T;
  importLocation?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ImportableItemName_rewrite?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: NonterminalNode) => T;
  ImportableItemName?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ExportableItemName_rewrite?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: NonterminalNode) => T;
  ExportableItemName?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  statementTerminator_semicolon?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode) => T;
  statementTerminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  expressionTerminator_comma?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode) => T;
  expressionTerminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  typeTerminator_comma?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode) => T;
  typeTerminator_semicolon?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode) => T;
  typeTerminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  colonTerminator_colon?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode) => T;
  colonTerminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  terminator_implied?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode | TerminalNode) => T;
  terminator?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  lineTerminator?: (this: NonterminalNode, arg0: IterationNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  lineContinuer?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  Expression?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  LiteralExp_parenthesized?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  LiteralExp_array?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: TerminalNode) => T;
  LiteralExp_object?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: TerminalNode) => T;
  LiteralExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  InlineClassDeclaration?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: TerminalNode, arg6: IterationNode, arg7: TerminalNode) => T;
  ArrayEntry_spread_operator?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  ArrayEntry?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  InlineFunction_no_params?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  InlineFunction_with_params?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: NonterminalNode, arg5: NonterminalNode) => T;
  InlineFunction?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  BlockFunction_no_params?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  BlockFunction_with_params?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode, arg7: NonterminalNode) => T;
  BlockFunction?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Method_no_params?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: Node, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  Method_with_params?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: Node, arg3: NonterminalNode, arg4: IterationNode, arg5: TerminalNode, arg6: IterationNode, arg7: NonterminalNode, arg8: NonterminalNode) => T;
  Method?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  FunctionBody_expression?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  FunctionBody?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MethodName_identifier?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MethodName_symbol?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MethodName_string_key?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MethodName_computed_string_key?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MethodName_numerical_key?: (this: NonterminalNode, arg0: IterationNode) => T;
  MethodName_computed_key?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  MethodName?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ObjectEntry_restructure?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ObjectEntry_key_value?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  ObjectEntry_spread_operator?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  ObjectEntry_object_method?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ObjectEntry_object_method_with_self?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ObjectEntry?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ClassCreationExp_class_creation_symbolic?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode) => T;
  ClassCreationExp_class_creation_implied?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: IterationNode, arg4: NonterminalNode) => T;
  ClassCreationExp_class_creation_no_args?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  ClassCreationExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MemberAccessExp_member_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MemberAccessExp_optional_chaining_member_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MemberAccessExp_symbol_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MemberAccessExp_optional_chaining_symbol_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MemberAccessExp_computed_member_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  MemberAccessExp_optional_chaining_computed_member_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: TerminalNode) => T;
  MemberAccessExp_function_call?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  MemberAccessExp_optional_chaining_function_call?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: TerminalNode) => T;
  MemberAccessExp_function_call_implied?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  MemberAccessExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ArgumentList?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  NonEmptyArgumentList?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Argument_spread_operator?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Argument?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Parameter?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  RestParameter_with_type?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode) => T;
  RestParameter_without_type?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  RestParameter?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ParameterList_params?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: IterationNode) => T;
  ParameterList_rest_params?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ParameterList?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  NotExp_logical_not_symbolic?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  NotExp_logical_not_worded?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  NotExp_unary_plus?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  NotExp_unary_minus?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  NotExp_typeof?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: IterationNode, arg3: NonterminalNode) => T;
  NotExp_await?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  NotExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  ExpExp_exponentiate?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  ExpExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MulExp_multiplication?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MulExp_division?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MulExp_modulus?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  MulExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AddExp_addition?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AddExp_subtraction?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AddExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  CompareExp_less_than?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  CompareExp_less_than_equal?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  CompareExp_greater_than?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  CompareExp_greater_than_equal?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  CompareExp_within?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: IterationNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode) => T;
  CompareExp_not_within?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode) => T;
  CompareExp_instanceof?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode) => T;
  CompareExp_not_instanceof?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: IterationNode, arg4: TerminalNode, arg5: IterationNode, arg6: NonterminalNode) => T;
  CompareExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  EqualityExp_equal_to?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode | TerminalNode, arg2: NonterminalNode) => T;
  EqualityExp_not_equal_to?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode | TerminalNode, arg2: NonterminalNode) => T;
  EqualityExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  equalityExpWords?: (this: NonterminalNode, arg0: IterationNode, arg1: Node, arg2: IterationNode) => T;
  LogicalAndExp_logical_and?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode | NonterminalNode, arg2: TerminalNode, arg3: IterationNode | NonterminalNode, arg4: NonterminalNode) => T;
  LogicalAndExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  LogicalOrExp_logical_or?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode | NonterminalNode, arg2: TerminalNode, arg3: IterationNode | NonterminalNode, arg4: NonterminalNode) => T;
  LogicalOrExp_logical_nullish_coalescing?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  LogicalOrExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TernaryExp_symbolic?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  TernaryExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AssignmentExp_assignment?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AssignmentExp_yield?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode) => T;
  AssignmentExp_yield_from?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode | NonterminalNode, arg2: TerminalNode, arg3: IterationNode | NonterminalNode, arg4: NonterminalNode) => T;
  AssignmentExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  VariableAssignment?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: IterationNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  TypedVariableAssignment?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  AssignableOrAccessor?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AssignableWithTypeOrDefault_type_and_default?: (this: NonterminalNode, arg0: Node, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  AssignableWithTypeOrDefault_type_only?: (this: NonterminalNode, arg0: Node, arg1: IterationNode, arg2: TerminalNode, arg3: NonterminalNode) => T;
  AssignableWithTypeOrDefault_default_only?: (this: NonterminalNode, arg0: Node, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AssignableWithTypeOrDefault?: (this: NonterminalNode, arg0: Node) => T;
  AssignableWithDefault_with_default?: (this: NonterminalNode, arg0: Node, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AssignableWithDefault?: (this: NonterminalNode, arg0: Node) => T;
  AssignableKeyWithRewrite_rewrite?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  AssignableKeyWithRewrite?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Assignable_identifier?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Assignable_array?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: TerminalNode) => T;
  Assignable_object?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: TerminalNode) => T;
  Assignable?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  NonCapturingAssignable_array?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: TerminalNode) => T;
  NonCapturingAssignable_object?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: TerminalNode) => T;
  NonCapturingAssignable?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AccessorBase?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AccessorPropertyBase?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  AccessorAddon_member_access?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  AccessorAddon_symbol_access?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  AccessorAddon_computed_member_access?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  AccessorAddon?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Accessor?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) => T;
  NonAssignableAccessor?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) => T;
  whitespace?: (this: NonterminalNode, arg0: IterationNode) => T;
  sign?: (this: NonterminalNode, arg0: IterationNode) => T;
  number?: (this: NonterminalNode, arg0: IterationNode) => T;
  fullNumber?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: IterationNode, arg3: IterationNode, arg4: IterationNode, arg5: IterationNode, arg6: IterationNode) => T;
  unitNumber?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  decimalNumber?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  hexNumber?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: IterationNode) => T;
  bigint?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  boolean?: (this: NonterminalNode, arg0: TerminalNode) => T;
  null?: (this: NonterminalNode, arg0: TerminalNode) => T;
  undefined?: (this: NonterminalNode, arg0: TerminalNode) => T;
  id_continue?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_bit_character?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_bit_escape?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode) => T;
  string_bit_escape_sequence?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode) => T;
  string_bit_hex_sequence?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: NonterminalNode) => T;
  string_bit_unicode_sequence?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: NonterminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  string_bit_unicode_code_point_sequence?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  string_bit?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_interpolatable_bit_interpolated?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  string_interpolatable_bit?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_type_interpolatable_bit_interpolated?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  string_type_interpolatable_bit?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_interpolatable?: (this: NonterminalNode, arg0: Node, arg1: IterationNode, arg2: Node) => T;
  string_type_interpolatable?: (this: NonterminalNode, arg0: Node, arg1: IterationNode, arg2: Node) => T;
  string_full?: (this: NonterminalNode, arg0: Node, arg1: IterationNode, arg2: Node) => T;
  string?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_non_interpolatable?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  string_type?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  reserved_block?: (this: NonterminalNode, arg0: TerminalNode) => T;
  reserved_operators?: (this: NonterminalNode, arg0: TerminalNode) => T;
  reserved_inline?: (this: NonterminalNode, arg0: TerminalNode) => T;
  reserved_primitive?: (this: NonterminalNode, arg0: TerminalNode) => T;
  reserved_javascript?: (this: NonterminalNode, arg0: TerminalNode) => T;
  reserved?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  char?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  word?: (this: NonterminalNode, arg0: IterationNode, arg1: IterationNode, arg2: IterationNode) => T;
  identifierWord?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  identifierNumber?: (this: NonterminalNode, arg0: IterationNode, arg1: IterationNode, arg2: IterationNode) => T;
  identifierWords?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: IterationNode) => T;
  identifier?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  identOrWord?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Property_identifier?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Property_symbol?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Property_computed?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  Property?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  StaticProperty_identifier?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  StaticProperty_symbol?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  StaticProperty_computed?: (this: NonterminalNode, arg0: TerminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  StaticProperty?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  Symbol_symbol_for?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Symbol_builtin_symbol?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  Symbol?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  SymbolKey_name?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  SymbolKey_string?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  SymbolKey_computed?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  SymbolKey?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  space?: (this: NonterminalNode, arg0: NonterminalNode | TerminalNode) => T;
  block_comment?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: TerminalNode) => T;
  line_comment?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode | TerminalNode) => T;
  Type?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  PrimitiveType?: (this: NonterminalNode, arg0: TerminalNode) => T;
  LiteralType_identifier?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  LiteralType_parenthesized?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  LiteralType_namespace?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  LiteralType_type_args?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  LiteralType?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MemberAccessType_member_access?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: TerminalNode) => T;
  MemberAccessType_array?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: TerminalNode) => T;
  MemberAccessType_named_tuple?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  MemberAccessType_tuple?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  MemberAccessType_object?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  MemberAccessType?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  NamedTupleElement_name_value?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: NonterminalNode) => T;
  NamedTupleElement_spread_operator?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode) => T;
  NamedTupleElement?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TupleElement_value?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) => T;
  TupleElement_spread_operator?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode) => T;
  TupleElement?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeObjectKey_identifier?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeObjectKey_string?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeObjectKey_template_literal?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeObjectKey_computed_accessor?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode) => T;
  TypeObjectKey?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeObjectEntry?: (this: NonterminalNode, arg0: IterationNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode) => T;
  IntersectionType_intersection?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  IntersectionType?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  UnionType_union?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode) => T;
  UnionType?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  InterfaceDeclaration?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: TerminalNode) => T;
  TypeDeclaration?: (this: NonterminalNode, arg0: TerminalNode, arg1: IterationNode, arg2: NonterminalNode, arg3: TerminalNode, arg4: NonterminalNode, arg5: NonterminalNode) => T;
  TypeParameter?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: TerminalNode, arg3: NonterminalNode) => T;
  TypeRestParameter?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode) => T;
  TypeParameterList_params?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode, arg2: IterationNode) => T;
  TypeParameterList_rest_params?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TypeParameterList?: (this: NonterminalNode, arg0: NonterminalNode) => T;
}

export interface StorymaticSemantics extends Semantics {
  addOperation<T>(name: string, actionDict: StorymaticActionDict<T>): this;
  extendOperation<T>(name: string, actionDict: StorymaticActionDict<T>): this;
  addAttribute<T>(name: string, actionDict: StorymaticActionDict<T>): this;
  extendAttribute<T>(name: string, actionDict: StorymaticActionDict<T>): this;
}

export interface StorymaticGrammar extends Grammar {
  createSemantics(): StorymaticSemantics;
  extendSemantics(superSemantics: StorymaticSemantics): StorymaticSemantics;
}

declare const grammar: StorymaticGrammar;
export default grammar;

