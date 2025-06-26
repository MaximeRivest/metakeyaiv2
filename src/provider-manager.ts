export interface ProviderConfig {
  model: string;
  api_key?: string;
  config?: Record<string, any>;
  endpoint?: string;
}

export interface LLMProvider {
  name: string;
  type: 'cloud' | 'local';
  models: string[];
  endpoint?: string;
  requiresApiKey: boolean;
}

export class ProviderManager {
  private providers: Map<string, LLMProvider> = new Map();
  private apiKeys: Map<string, string> = new Map();
  private userPreferences: Map<string, string> = new Map();

  constructor() {
    this.initializeProviders();
    this.loadApiKeys();
  }

  /**
   * Get provider configuration for a spell
   */
  async getProviderConfig(
    supportedProviders: string[],
    defaultProvider?: string
  ): Promise<ProviderConfig> {
    // Choose provider based on preference and availability
    const chosenProvider = this.selectProvider(supportedProviders, defaultProvider);
    const provider = this.providers.get(chosenProvider);

    if (!provider) {
      throw new Error(`Provider ${chosenProvider} not found`);
    }

    const config: ProviderConfig = {
      model: this.getDefaultModel(chosenProvider),
    };

    // Add API key if required
    if (provider.requiresApiKey) {
      const apiKey = this.apiKeys.get(chosenProvider);
      if (!apiKey) {
        throw new Error(`API key required for provider ${chosenProvider}`);
      }
      config.api_key = apiKey;
    }

    // Add endpoint for local providers
    if (provider.endpoint) {
      config.endpoint = provider.endpoint;
    }

    return config;
  }

  /**
   * Set API key for a provider
   */
  setApiKey(provider: string, apiKey: string): void {
    this.apiKeys.set(provider, apiKey);
    this.saveApiKeys();
  }

  /**
   * Set user preference for provider
   */
  setProviderPreference(spellType: string, provider: string): void {
    this.userPreferences.set(spellType, provider);
    this.savePreferences();
  }

  /**
   * Register a new provider
   */
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Check if Ollama is running and available
   */
  async checkOllamaHealth(): Promise<boolean> {
    try {
      // Simple fetch to check if Ollama is running
      // In a real implementation, you'd use node-fetch or similar
      console.log('Checking Ollama health (mock)...');
      return true; // Mock success for now
    } catch {
      return false;
    }
  }

  /**
   * Initialize default providers
   */
  private initializeProviders(): void {
    // Cloud providers
    this.providers.set('openai', {
      name: 'openai',
      type: 'cloud',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      requiresApiKey: true,
    });

    this.providers.set('anthropic', {
      name: 'anthropic',
      type: 'cloud',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      requiresApiKey: true,
    });

    // Local providers
    this.providers.set('local-ollama', {
      name: 'local-ollama',
      type: 'local',
      models: ['llama3.2:1b', 'llama3.2:3b', 'llama3.1:8b'],
      endpoint: 'http://localhost:11434',
      requiresApiKey: false,
    });
  }

  /**
   * Select the best provider for a spell
   */
  private selectProvider(supportedProviders: string[], defaultProvider?: string): string {
    // 1. Use default provider if specified and supported
    if (defaultProvider && supportedProviders.includes(defaultProvider)) {
      const provider = this.providers.get(defaultProvider);
      if (provider && this.isProviderAvailable(defaultProvider)) {
        return defaultProvider;
      }
    }

    // 2. Check user preferences
    const userPref = this.userPreferences.get('default');
    if (userPref && supportedProviders.includes(userPref)) {
      const provider = this.providers.get(userPref);
      if (provider && this.isProviderAvailable(userPref)) {
        return userPref;
      }
    }

    // 3. Prefer local providers if available
    for (const providerName of supportedProviders) {
      const provider = this.providers.get(providerName);
      if (provider?.type === 'local' && this.isProviderAvailable(providerName)) {
        return providerName;
      }
    }

    // 4. Fall back to any available provider
    for (const providerName of supportedProviders) {
      if (this.isProviderAvailable(providerName)) {
        return providerName;
      }
    }

    throw new Error(`No available providers from: ${supportedProviders.join(', ')}`);
  }

  /**
   * Check if a provider is available (has API key if needed, etc.)
   */
  private isProviderAvailable(providerName: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) return false;

    // For cloud providers, check if API key is available
    if (provider.requiresApiKey && !this.apiKeys.has(providerName)) {
      return false;
    }

    // For local providers, could check if server is running
    // For now, assume local providers are always available
    return true;
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModel(providerName: string): string {
    const provider = this.providers.get(providerName);
    if (!provider || provider.models.length === 0) {
      throw new Error(`No models available for provider ${providerName}`);
    }

    // Return the first model as default
    return provider.models[0];
  }

  /**
   * Load API keys from secure storage
   */
  private loadApiKeys(): void {
    // In production, this would load from OS keychain or encrypted storage
    // For demo, we'll use environment variables
    
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.apiKeys.set('openai', openaiKey);
      console.log('🔑 Loaded OpenAI API key from environment');
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.apiKeys.set('anthropic', anthropicKey);
      console.log('🔑 Loaded Anthropic API key from environment');
    }
  }

  /**
   * Save API keys to secure storage
   */
  private saveApiKeys(): void {
    // In production, this would save to OS keychain or encrypted storage
    console.log('🔐 API keys saved (demo mode)');
  }

  /**
   * Save user preferences
   */
  private savePreferences(): void {
    // In production, this would save to config file
    console.log('💾 Provider preferences saved (demo mode)');
  }

  /**
   * List all registered providers
   */
  listProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get available models for a provider
   */
  getProviderModels(providerName: string): string[] {
    const provider = this.providers.get(providerName);
    return provider?.models || [];
  }

  /**
   * Check if a provider has required credentials
   */
  hasCredentials(providerName: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) return false;
    
    if (provider.requiresApiKey) {
      return this.apiKeys.has(providerName);
    }
    
    return true; // Local providers don't need credentials
  }
} 