// src/customTypes.ts
import { BaseEditor } from 'slate';
import { ReactEditor } from 'slate-react';

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  // link can be used as a mark carrying the href
  link?: string;
};

export type HeadingElement = {
  type: 'heading';
  children: CustomText[];
  textAlign?: 'left' | 'center' | 'right' | 'inherit';
};

export type Heading2Element = {
  type: 'heading-2';
  children: CustomText[];
  textAlign?: 'left' | 'center' | 'right' | 'inherit';
};

export type Heading3Element = {
  type: 'heading-3';
  children: CustomText[];
  textAlign?: 'left' | 'center' | 'right' | 'inherit';
};

export type BlockQuoteElement = {
  type: 'block-quote';
  children: CustomText[];
  textAlign?: 'left' | 'center' | 'right' | 'inherit';
};

export type ParagraphElement = {
  type: 'paragraph';
  children: CustomText[];
  textAlign?: 'left' | 'center' | 'right' | 'inherit';
};

export type CodeLineElement = {
  type: 'code-line';
  children: CustomText[];
};

export type CodeBlockElement = {
  type: 'code-block';
  children: CodeLineElement[];
};

export type LinkElement = {
  type: 'link';
  url?: string;
  children: CustomText[];
};

export type CustomElement =
  | HeadingElement
  | Heading2Element
  | Heading3Element
  | BlockQuoteElement
  | ParagraphElement
  | CodeBlockElement
  | CodeLineElement
  | LinkElement;

export type FormatMark = 'bold' | 'italic' | 'underline' | 'code';

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}
