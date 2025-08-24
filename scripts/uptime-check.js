#!/usr/bin/env node

/**
 * Uptime Monitoring Script for Fantasy Editor
 * Performs comprehensive health checks and sends alerts when issues are detected
 */

const https = require('https');
const http = require('http');

class UptimeMonitor {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'https://forgewright.io';
    this.slackWebhook = process.env.SLACK_WEBHOOK;
    this.timeout = 10000; // 10 seconds
    this.checks = [];
  }

  async makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const requestOptions = {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Fantasy-Editor-Uptime-Monitor/1.0'
        },
        ...options
      };

      const req = client.get(url, requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime: Date.now() - startTime
          });
        });
      });

      const startTime = Date.now();
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async checkEndpoint(url, expectedStatus = 200, description = '') {
    const checkName = description || url;
    console.log(`🔍 Checking: ${checkName}`);
    
    try {
      const response = await this.makeHttpRequest(url);
      const success = response.statusCode === expectedStatus;
      
      const result = {
        name: checkName,
        url: url,
        status: success ? 'UP' : 'DOWN',
        statusCode: response.statusCode,
        responseTime: response.responseTime,
        error: success ? null : `Expected ${expectedStatus}, got ${response.statusCode}`,
        timestamp: new Date().toISOString()
      };
      
      this.checks.push(result);
      
      if (success) {
        console.log(`✅ ${checkName}: ${response.statusCode} (${response.responseTime}ms)`);
      } else {
        console.log(`❌ ${checkName}: ${response.statusCode} (${response.responseTime}ms)`);
      }
      
      return result;
    } catch (error) {
      const result = {
        name: checkName,
        url: url,
        status: 'DOWN',
        statusCode: null,
        responseTime: null,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.checks.push(result);
      console.log(`❌ ${checkName}: ${error.message}`);
      return result;
    }
  }

  async checkApplicationFeatures() {
    console.log('🧪 Running application feature checks...');
    
    // Check main application
    await this.checkEndpoint(this.baseUrl, 200, 'Homepage');
    await this.checkEndpoint(`${this.baseUrl}/app`, 200, 'Application');
    
    // Check different themes
    await this.checkEndpoint(`${this.baseUrl}/?theme=dark`, 200, 'Dark Theme');
    await this.checkEndpoint(`${this.baseUrl}/?theme=light`, 200, 'Light Theme');
    await this.checkEndpoint(`${this.baseUrl}/?theme=fantasy`, 200, 'Fantasy Theme');
    
    // Check manifest and service worker
    await this.checkEndpoint(`${this.baseUrl}/manifest.json`, 200, 'PWA Manifest');
    await this.checkEndpoint(`${this.baseUrl}/sw.js`, 200, 'Service Worker');
    
    // Check static assets
    await this.checkEndpoint(`${this.baseUrl}/favicon.ico`, 200, 'Favicon');
    
    // Check 404 handling
    await this.checkEndpoint(`${this.baseUrl}/non-existent-page`, 200, '404 Handling (SPA)');
  }

  async checkSecurityHeaders() {
    console.log('🛡️  Checking security headers...');
    
    try {
      const response = await this.makeHttpRequest(this.baseUrl);
      const headers = response.headers;
      
      const securityChecks = [
        { name: 'X-Frame-Options', header: 'x-frame-options', expected: 'DENY' },
        { name: 'X-Content-Type-Options', header: 'x-content-type-options', expected: 'nosniff' },
        { name: 'X-XSS-Protection', header: 'x-xss-protection', expected: '1; mode=block' },
        { name: 'Strict-Transport-Security', header: 'strict-transport-security', required: true },
        { name: 'Content-Security-Policy', header: 'content-security-policy', required: true }
      ];
      
      for (const check of securityChecks) {
        const headerValue = headers[check.header];
        const hasHeader = !!headerValue;
        const isCorrect = check.expected ? headerValue === check.expected : hasHeader;
        
        this.checks.push({
          name: `Security Header: ${check.name}`,
          status: isCorrect ? 'UP' : 'DOWN',
          error: isCorrect ? null : `Missing or incorrect ${check.name} header`,
          responseTime: null,
          timestamp: new Date().toISOString()
        });
        
        if (isCorrect) {
          console.log(`✅ ${check.name}: Present`);
        } else {
          console.log(`❌ ${check.name}: ${headerValue || 'Missing'}`);
        }
      }
    } catch (error) {
      console.error('❌ Security header check failed:', error.message);
    }
  }

  async checkPerformance() {
    console.log('⚡ Running performance checks...');
    
    const performanceUrl = this.baseUrl;
    const startTime = Date.now();
    
    try {
      const response = await this.makeHttpRequest(performanceUrl);
      const responseTime = response.responseTime;
      
      const performanceCheck = {
        name: 'Response Time',
        status: responseTime < 2000 ? 'UP' : 'DOWN',
        responseTime: responseTime,
        error: responseTime >= 2000 ? `Slow response: ${responseTime}ms` : null,
        timestamp: new Date().toISOString()
      };
      
      this.checks.push(performanceCheck);
      
      if (responseTime < 1000) {
        console.log(`✅ Response Time: ${responseTime}ms (Excellent)`);
      } else if (responseTime < 2000) {
        console.log(`⚠️  Response Time: ${responseTime}ms (Good)`);
      } else {
        console.log(`❌ Response Time: ${responseTime}ms (Slow)`);
      }
      
      // Check if content is gzipped
      const isGzipped = response.headers['content-encoding'] === 'gzip';
      this.checks.push({
        name: 'Content Compression',
        status: isGzipped ? 'UP' : 'DOWN',
        error: isGzipped ? null : 'Content not compressed',
        timestamp: new Date().toISOString()
      });
      
      console.log(`${isGzipped ? '✅' : '❌'} Content Compression: ${isGzipped ? 'Enabled' : 'Disabled'}`);
      
    } catch (error) {
      console.error('❌ Performance check failed:', error.message);
    }
  }

  async sendAlert(failedChecks) {
    if (!this.slackWebhook || failedChecks.length === 0) {
      return;
    }
    
    console.log(`📢 Sending alert for ${failedChecks.length} failed checks...`);
    
    const message = {
      username: 'Uptime Monitor',
      icon_emoji: ':warning:',
      attachments: [{
        color: 'danger',
        title: '🚨 Fantasy Editor - Service Issues Detected',
        fields: [
          {
            title: 'Failed Checks',
            value: failedChecks.length.toString(),
            short: true
          },
          {
            title: 'Total Checks',
            value: this.checks.length.toString(),
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true
          },
          {
            title: 'Issues',
            value: failedChecks.map(check => `• ${check.name}: ${check.error}`).join('\n'),
            short: false
          }
        ],
        footer: 'Fantasy Editor Uptime Monitor'
      }]
    };
    
    try {
      const response = await this.makeHttpRequest(this.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });
      
      console.log('✅ Alert sent successfully');
    } catch (error) {
      console.error('❌ Failed to send alert:', error.message);
    }
  }

  async generateReport() {
    const failedChecks = this.checks.filter(check => check.status === 'DOWN');
    const totalChecks = this.checks.length;
    const successRate = ((totalChecks - failedChecks.length) / totalChecks * 100).toFixed(1);
    
    console.log('\n📊 Uptime Check Report');
    console.log('=======================');
    console.log(`Total Checks: ${totalChecks}`);
    console.log(`Successful: ${totalChecks - failedChecks.length}`);
    console.log(`Failed: ${failedChecks.length}`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (failedChecks.length > 0) {
      console.log('\n❌ Failed Checks:');
      failedChecks.forEach(check => {
        console.log(`  • ${check.name}: ${check.error}`);
      });
    } else {
      console.log('\n✅ All checks passed!');
    }
    
    // Send alert if there are failures
    if (failedChecks.length > 0) {
      await this.sendAlert(failedChecks);
    }
    
    return {
      totalChecks,
      failedChecks: failedChecks.length,
      successRate: parseFloat(successRate),
      timestamp: new Date().toISOString()
    };
  }

  async run() {
    console.log('🚀 Starting Fantasy Editor uptime monitoring...');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);
    
    try {
      await this.checkApplicationFeatures();
      await this.checkSecurityHeaders();
      await this.checkPerformance();
      
      const report = await this.generateReport();
      
      // Exit with error code if checks failed
      process.exit(report.failedChecks > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('💥 Monitoring failed:', error.message);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const monitor = new UptimeMonitor();
  await monitor.run();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = UptimeMonitor;