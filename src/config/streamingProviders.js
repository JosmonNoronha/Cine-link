/**
 * Streaming Providers Configuration
 * Maps TMDB provider IDs to app configuration
 */

export const STREAMING_PROVIDERS = {
  // Major Streaming Services
  8: {
    id: 8,
    name: 'Netflix',
    logo: 'https://image.tmdb.org/t/p/original/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg',
    color: '#E50914',
    icon: 'play-circle',
    type: 'subscription',
  },
  9: {
    id: 9,
    name: 'Amazon Prime Video',
    logo: 'https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg',
    color: '#00A8E1',
    icon: 'logo-amazon',
    type: 'subscription',
  },
  337: {
    id: 337,
    name: 'Disney Plus',
    logo: 'https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg',
    color: '#113CCF',
    icon: 'star',
    type: 'subscription',
  },
  384: {
    id: 384,
    name: 'HBO Max',
    logo: 'https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaVQwJSqvqRAD.jpg',
    color: '#7B16FF',
    icon: 'film',
    type: 'subscription',
  },
  15: {
    id: 15,
    name: 'Hulu',
    logo: 'https://image.tmdb.org/t/p/original/pqUTCleNUiTLAVlelGxUgWn1ELh.jpg',
    color: '#1CE783',
    icon: 'film',
    type: 'subscription',
  },
  350: {
    id: 350,
    name: 'Apple TV Plus',
    logo: 'https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg',
    color: '#000000',
    icon: 'logo-apple',
    type: 'subscription',
  },
  531: {
    id: 531,
    name: 'Paramount Plus',
    logo: 'https://image.tmdb.org/t/p/original/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg',
    color: '#0064FF',
    icon: 'film',
    type: 'subscription',
  },
  29: {
    id: 29,
    name: 'Peacock',
    logo: 'https://image.tmdb.org/t/p/original/wYUDF56ZXPR9i0JJJ1cvuDGM1Fz.jpg',
    color: '#000000',
    icon: 'film',
    type: 'subscription',
  },
  // Rental/Purchase
  2: {
    id: 2,
    name: 'Apple iTunes',
    logo: 'https://image.tmdb.org/t/p/original/peURlLlr8jggOwK53fJ5wdQl05y.jpg',
    color: '#000000',
    icon: 'logo-apple',
    type: 'rent',
  },
  3: {
    id: 3,
    name: 'Google Play Movies',
    logo: 'https://image.tmdb.org/t/p/original/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg',
    color: '#4285F4',
    icon: 'logo-google',
    type: 'rent',
  },
  10: {
    id: 10,
    name: 'Amazon Video',
    logo: 'https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg',
    color: '#00A8E1',
    icon: 'logo-amazon',
    type: 'rent',
  },
  192: {
    id: 192,
    name: 'YouTube',
    logo: 'https://image.tmdb.org/t/p/original/8kxa4HgM1u9qnVDN9wyevhB2Uzr.jpg',
    color: '#FF0000',
    icon: 'logo-youtube',
    type: 'rent',
  },
};

/**
 * Get provider info by ID
 */
export const getProviderById = (id) => {
  return STREAMING_PROVIDERS[id] || {
    id,
    name: 'Unknown Provider',
    icon: 'film-outline',
    color: '#666',
    type: 'subscription',
  };
};

/**
 * Get all subscription-based providers
 */
export const getSubscriptionProviders = () => {
  return Object.values(STREAMING_PROVIDERS).filter(
    (p) => p.type === 'subscription'
  );
};

/**
 * Get provider names for user selection
 */
export const getProviderOptions = () => {
  return getSubscriptionProviders().map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    color: p.color,
  }));
};

/**
 * Format watch providers for display
 */
export const formatWatchProviders = (providers, region = 'US') => {
  console.log('🔧 formatWatchProviders input:', { providers, region });
  
  if (!providers) {
    console.log('⚠️ No providers object');
    return {
      streaming: [],
      rent: [],
      buy: [],
    };
  }

  if (!providers.results) {
    console.log('⚠️ No results in providers');
    return {
      streaming: [],
      rent: [],
      buy: [],
    };
  }

  if (!providers.results[region]) {
    console.log(`⚠️ No data for region ${region}. Available regions:`, Object.keys(providers.results));
    return {
      streaming: [],
      rent: [],
      buy: [],
    };
  }

  const regionData = providers.results[region];
  console.log('📊 Region data:', regionData);

  const result = {
    streaming: (regionData.flatrate || []).map((p) => getProviderById(p.provider_id)),
    rent: (regionData.rent || []).map((p) => getProviderById(p.provider_id)),
    buy: (regionData.buy || []).map((p) => getProviderById(p.provider_id)),
    link: regionData.link,
  };
  
  console.log('✅ Formatted result:', result);
  return result;
};

/**
 * Check if content is available on user's subscriptions
 */
export const isAvailableOnSubscriptions = (providers, userSubscriptions, region = 'US') => {
  if (!providers?.results?.[region]?.flatrate || !userSubscriptions?.length) {
    return false;
  }

  const availableProviders = providers.results[region].flatrate.map(
    (p) => p.provider_id
  );

  return userSubscriptions.some((subId) => availableProviders.includes(subId));
};
