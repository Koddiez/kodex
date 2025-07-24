import { countTokens } from './token-counter';

type TemplateFunction = (context: Record<string, any>) => string;

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string | TemplateFunction;
  inputVariables: string[];
  maxTokens?: number;
}

const TEMPLATES: Record<string, PromptTemplate> = {
  CODE_GENERATION: {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generate code based on a description',
    template: (context) => {
      const { description, language, framework } = context;
      return `You are a senior ${language} developer. Generate high-quality, production-ready code.
      
      Requirements:
      - Language: ${language}
      - Framework: ${framework || 'None specified'}
      - Description: ${description}
      
      Generate the code below this line:
      `;
    },
    inputVariables: ['description', 'language'],
    maxTokens: 2000,
  },
  CODE_EXPLANATION: {
    id: 'code-explanation',
    name: 'Code Explanation',
    description: 'Explain what the code does',
    template: (context) => {
      const { code, language } = context;
      return `Explain what the following ${language} code does in simple terms:
      
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Explanation:`;
    },
    inputVariables: ['code', 'language'],
  },
  CODE_REVIEW: {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for improvements',
    template: (context) => {
      const { code, language, guidelines } = context;
      return `Review the following ${language} code and provide feedback on:
      1. Code quality
      2. Potential bugs
      3. Performance improvements
      4. Best practices
      ${guidelines ? `\nAdditional guidelines:\n${guidelines}` : ''}
      
      Code to review:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Review:`;
    },
    inputVariables: ['code', 'language'],
  },
};

export function getTemplate(templateId: string): PromptTemplate | undefined {
  return TEMPLATES[templateId];
}

export function renderTemplate(
  templateId: string, 
  context: Record<string, any>,
  options: { maxTokens?: number } = {}
): string {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Check for missing required variables
  const missingVars = template.inputVariables.filter(
    (varName) => context[varName] === undefined
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required variables for template ${templateId}: ${missingVars.join(', ')}`
    );
  }

  // Render the template
  const rendered = typeof template.template === 'function'
    ? template.template(context)
    : template.template;

  // Apply token limit if specified
  const maxTokens = options.maxTokens || template.maxTokens;
  if (maxTokens) {
    const tokens = countTokens(rendered);
    if (tokens > maxTokens) {
      console.warn(
        `Prompt exceeds token limit (${tokens} > ${maxTokens}). Consider reducing the input size.`
      );
    }
  }

  return rendered;
}

export const DEFAULT_TEMPLATE = TEMPLATES.CODE_GENERATION;
