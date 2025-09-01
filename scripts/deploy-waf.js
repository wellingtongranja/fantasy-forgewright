#!/usr/bin/env node

/**
 * Deploy WAF Rules to Cloudflare
 * This script deploys Web Application Firewall rules to protect Fantasy Editor
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CloudflareWAFDeployer {
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
    
    if (!this.apiToken || !this.zoneId) {
      throw new Error('Missing required environment variables: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID');
    }
  }

  async makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Fantasy-Editor-WAF-Deployer/1.0'
        }
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.success) {
              resolve(response.result);
            } else {
              reject(new Error(`Cloudflare API Error: ${response.errors?.[0]?.message || 'Unknown error'}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async getExistingRules() {
    try {
      console.log('🔍 Fetching existing WAF rules...');
      const rules = await this.makeRequest('GET', `/zones/${this.zoneId}/firewall/rules`);
      console.log(`Found ${rules.length} existing rules`);
      return rules;
    } catch (error) {
      console.warn('⚠️  Could not fetch existing rules:', error.message);
      return [];
    }
  }

  async deleteRule(ruleId) {
    try {
      await this.makeRequest('DELETE', `/zones/${this.zoneId}/firewall/rules/${ruleId}`);
      console.log(`🗑️  Deleted rule: ${ruleId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete rule ${ruleId}:`, error.message);
      return false;
    }
  }

  async createRule(rule) {
    try {
      const ruleData = {
        filter: {
          expression: rule.expression,
          description: rule.description
        },
        action: rule.action,
        description: rule.description,
        priority: rule.priority || 1000
      };

      const result = await this.makeRequest('POST', `/zones/${this.zoneId}/firewall/rules`, [ruleData]);
      console.log(`✅ Created rule: ${rule.id} (${rule.description})`);
      return result[0];
    } catch (error) {
      console.error(`❌ Failed to create rule ${rule.id}:`, error.message);
      throw error;
    }
  }

  async deployRules() {
    try {
      console.log('🚀 Starting WAF rules deployment...');

      // Load WAF rules configuration
      const rulesPath = path.join(__dirname, '..', 'cloudflare', 'waf-rules.json');
      const rulesConfig = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      
      console.log(`📋 Found ${rulesConfig.rules.length} rules to deploy`);

      // Get existing rules
      const existingRules = await this.getExistingRules();
      
      // Delete existing Fantasy Editor rules (rules with our description patterns)
      const ourRules = existingRules.filter(rule => 
        rule.description && (
          rule.description.includes('Fantasy Editor') ||
          rule.description.includes('Rate limit') ||
          rule.description.includes('Block') ||
          rule.description.includes('Protect') ||
          rule.description.includes('Challenge')
        )
      );

      if (ourRules.length > 0) {
        console.log(`🧹 Cleaning up ${ourRules.length} existing rules...`);
        for (const rule of ourRules) {
          await this.deleteRule(rule.id);
          // Rate limiting to avoid API limits
          await this.sleep(200);
        }
      }

      // Deploy new rules
      console.log('📝 Deploying new WAF rules...');
      const deployedRules = [];

      for (const rule of rulesConfig.rules) {
        try {
          const deployedRule = await this.createRule(rule);
          deployedRules.push(deployedRule);
          
          // Rate limiting to avoid API limits
          await this.sleep(300);
        } catch (error) {
          console.error(`Failed to deploy rule ${rule.id}, continuing...`);
        }
      }

      console.log('🎉 WAF deployment completed successfully!');
      console.log(`✅ Deployed ${deployedRules.length}/${rulesConfig.rules.length} rules`);

      // Generate summary
      this.generateDeploymentSummary(deployedRules, rulesConfig.rules);

      return deployedRules;
    } catch (error) {
      console.error('💥 WAF deployment failed:', error.message);
      process.exit(1);
    }
  }

  generateDeploymentSummary(deployedRules, allRules) {
    console.log('\n📊 Deployment Summary:');
    console.log('========================');
    
    const rulesByAction = deployedRules.reduce((acc, rule) => {
      acc[rule.action] = (acc[rule.action] || 0) + 1;
      return acc;
    }, {});

    Object.entries(rulesByAction).forEach(([action, count]) => {
      console.log(`${action.toUpperCase()}: ${count} rules`);
    });

    console.log('\n🔒 Security Coverage:');
    const securityCategories = {
      'Rate Limiting': deployedRules.filter(r => r.description.includes('Rate limit')).length,
      'Injection Protection': deployedRules.filter(r => r.description.includes('injection') || r.description.includes('SQL')).length,
      'XSS Protection': deployedRules.filter(r => r.description.includes('XSS')).length,
      'Bot Protection': deployedRules.filter(r => r.description.includes('bot')).length,
      'Geographic Controls': deployedRules.filter(r => r.description.includes('geo')).length
    };

    Object.entries(securityCategories).forEach(([category, count]) => {
      console.log(`${category}: ${count} rules`);
    });

    if (deployedRules.length < allRules.length) {
      console.log(`\n⚠️  Warning: ${allRules.length - deployedRules.length} rules failed to deploy`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  try {
    const deployer = new CloudflareWAFDeployer();
    await deployer.deployRules();
  } catch (error) {
    console.error('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CloudflareWAFDeployer;