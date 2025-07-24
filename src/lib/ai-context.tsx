'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type AIModel = {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
};

type AIContextType = {
  selectedModel: AIModel | null;
  setSelectedModel: (model: AIModel) => void;
  availableModels: AIModel[];
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
};

const defaultModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    maxTokens: 8000,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 200000,
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    maxTokens: 30720,
  },
];

const AIContext = createContext<AIContextType>({
  selectedModel: null,
  setSelectedModel: () => {},
  availableModels: [],
  isGenerating: false,
  setIsGenerating: () => {},
});

export function useAI() {
  return useContext(AIContext);
}

type AIProviderProps = {
  children: ReactNode;
};

export function AIProvider({ children }: AIProviderProps) {
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(defaultModels[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <AIContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
        availableModels: defaultModels,
        isGenerating,
        setIsGenerating,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export default AIContext;
