import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import path from 'path';

export interface TransformOptions {
  cwd: string;
  filename: string;
}

export function transformCode(source: string, options: TransformOptions): string {
  // Parse code into AST
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  // Get relative path from root
  const relativePath = path.relative(options.cwd, options.filename).replace(/\\/g, '/');

  traverse(ast, {
    JSXOpeningElement(path) {
      const node = path.node;
      
      // Skip fragments <></>
      if (t.isJSXIdentifier(node.name) && node.name.name === 'Fragment') return;
      if (t.isJSXMemberExpression(node.name) && t.isJSXIdentifier(node.name.property) && node.name.property.name === 'Fragment') return;
      
      const line = node.loc?.start.line;
      if (!line) return;

      // Check if attributes already exist
      const hasFileAttr = node.attributes.some(
        attr => t.isJSXAttribute(attr) && attr.name.name === 'data-source-file'
      );

      if (!hasFileAttr) {
        node.attributes.push(
          t.jsxAttribute(t.jsxIdentifier('data-source-file'), t.stringLiteral(relativePath)),
          t.jsxAttribute(t.jsxIdentifier('data-source-line'), t.stringLiteral(String(line)))
        );
      }
    }
  });

  const output = generate(ast, {}, source);
  return output.code;
}
