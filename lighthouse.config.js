module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost/'],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'interactive': ['warn', { maxNumericValue: 3000 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 200000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 1000000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
