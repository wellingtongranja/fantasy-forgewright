/**
 * Fantasy Editor - System Documents Manager
 * Copyright (c) 2025 Forgewright
 * 
 * This file is part of Fantasy Editor.
 * 
 * Fantasy Editor Community Edition is free software: you can redistribute 
 * it and/or modify it under the terms of the GNU Affero General Public 
 * License as published by the Free Software Foundation, either version 3 
 * of the License, or (at your option) any later version.
 * 
 * For commercial licensing options, please contact licensing@forgewright.io
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

/**
 * System Documents Manager
 * Manages built-in readonly documents for help, licensing, legal content
 */
export class SystemDocumentsManager {
  constructor(storageManager) {
    this.storageManager = storageManager
    this.systemDocuments = new Map()
    this.initializeSystemDocuments()
  }

  /**
   * Initialize all system documents with their content
   */
  initializeSystemDocuments() {
    // Help documentation
    this.systemDocuments.set('help', {
      systemId: 'help',
      title: 'Fantasy Editor Help',
      content: this.getHelpContent(),
      type: 'system',
      readonly: true,
      tags: ['help', 'documentation', 'commands']
    })

    // AGPL v3 License (Community Edition)
    this.systemDocuments.set('license', {
      systemId: 'license',
      title: 'AGPL v3 License (Community Edition)',
      content: this.getAGPLLicenseContent(),
      type: 'system',
      readonly: true,
      tags: ['license', 'legal', 'agpl', 'open-source']
    })

    // Commercial License
    this.systemDocuments.set('commercial', {
      systemId: 'commercial',
      title: 'Commercial License Terms',
      content: this.getCommercialLicenseContent(),
      type: 'system',
      readonly: true,
      tags: ['license', 'commercial', 'premium']
    })

    // Release Notes
    this.systemDocuments.set('release', {
      systemId: 'release',
      title: 'Release Notes',
      content: this.getReleaseNotesContent(),
      type: 'system',
      readonly: true,
      tags: ['release', 'changelog', 'updates']
    })

    // End User License Agreement
    this.systemDocuments.set('eula', {
      systemId: 'eula',
      title: 'End User License Agreement',
      content: this.getEULAContent(),
      type: 'system',
      readonly: true,
      tags: ['eula', 'legal', 'terms']
    })

    // Privacy Policy
    this.systemDocuments.set('privacy', {
      systemId: 'privacy',
      title: 'Privacy Policy',
      content: this.getPrivacyPolicyContent(),
      type: 'system',
      readonly: true,
      tags: ['privacy', 'legal', 'data']
    })
  }

  /**
   * Get system document by systemId
   * @param {string} systemId - System document identifier
   * @returns {Object|null} System document or null
   */
  async getSystemDocument(systemId) {
    // First check if it's already in storage
    const existingDoc = await this.storageManager.getSystemDocument(systemId)
    if (existingDoc) {
      return existingDoc
    }

    // If not in storage, get from built-in documents and save
    const systemDoc = this.systemDocuments.get(systemId)
    if (!systemDoc) {
      return null
    }

    // Create document with GUID
    const guid = this.storageManager.generateGUID()
    const document = {
      id: guid,
      ...systemDoc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checksum: this.storageManager.generateChecksum(systemDoc.content)
    }

    try {
      // Save to storage (bypassing readonly checks for initial creation)
      await this.storageManager.db.transaction([this.storageManager.storeName], 'readwrite')
        .objectStore(this.storageManager.storeName).put(document)
      
      return document
    } catch (error) {
      console.error('Failed to save system document:', error)
      return document // Return without saving if storage fails
    }
  }

  /**
   * Get all system documents
   * @returns {Promise<Array>} Array of all system documents
   */
  async getAllSystemDocuments() {
    const documents = []
    for (const systemId of this.systemDocuments.keys()) {
      const doc = await this.getSystemDocument(systemId)
      if (doc) {
        documents.push(doc)
      }
    }
    return documents
  }

  /**
   * Check if system document exists
   * @param {string} systemId - System document identifier
   * @returns {boolean} Whether system document exists
   */
  hasSystemDocument(systemId) {
    return this.systemDocuments.has(systemId)
  }

  /**
   * Get list of available system document IDs
   * @returns {Array<string>} Array of system document IDs
   */
  getSystemDocumentIds() {
    return Array.from(this.systemDocuments.keys())
  }

  /**
   * Help documentation content
   * @private
   */
  getHelpContent() {
    return `# Fantasy Editor Help

## Welcome to Fantasy Editor

Fantasy Editor is a distraction-free, keyboard-first markdown editor designed for writers. Access all functionality through the command palette with \`Ctrl+Space\`.

## Command System

All functionality is accessed via the command palette (\`Ctrl+Space\`). Commands use the \`:xx\` pattern for quick access.

### Core Commands

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:n\`** | Create new document | \`:n My Story\` |
| **\`:s\`** | Save current document | \`:s\` |
| **\`:o\`** | Open document | \`:o dragon\` |
| **\`:f\`** | Search documents | \`:f magic spells\` |
| **\`:t\`** | Change theme | \`:t dark\` |
| **\`:tt\`** | Toggle theme | \`:tt\` |
| **\`:i\`** | Document info | \`:i\` |
| **\`:h\`** | Show help (this document) | \`:h\` |

### Editor Width and Zoom Commands

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:65\`** | Set width to 65 columns | \`:65\` |
| **\`:80\`** | Set width to 80 columns | \`:80\` |
| **\`:90\`** | Set width to 90 columns | \`:90\` |
| **\`:zi\`** | Zoom in (increase font size) | \`:zi\` |
| **\`:zo\`** | Zoom out (decrease font size) | \`:zo\` |
| **\`:zr\`** | Reset zoom to 100% | \`:zr\` |
| **\`:ei\`** | Show editor info | \`:ei\` |

### Export Commands

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:ex\`** | Export document | \`:ex md\` |
| **\`:em\`** | Export as Markdown | \`:em\` |
| **\`:et\`** | Export as Text | \`:et\` |
| **\`:eh\`** | Export as HTML | \`:eh\` |
| **\`:ep\`** | Export as PDF | \`:ep\` |

### Document Management

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:d\`** | Show documents | \`:d\` or \`:d filter\` |
| **\`:l\`** | Show outline | \`:l\` |
| **\`:fs\`** | Focus search | \`:fs\` |
| **\`:fd\`** | Focus documents | \`:fd\` |
| **\`:ts\`** | Toggle sidebar | \`:ts\` |
| **\`:tag\`** | Manage tags | \`:tag add fantasy\` |

### Readonly Commands

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:ro\`** | Make document readonly | \`:ro\` |
| **\`:rw\`** | Make document editable | \`:rw\` |

### System Documents

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:help\`** | Open this help | \`:help\` |
| **\`:license\`** | View AGPL v3 license | \`:license\` |
| **\`:commercial\`** | View commercial license | \`:commercial\` |
| **\`:release\`** | View release notes | \`:release\` |
| **\`:eula\`** | View End User Agreement | \`:eula\` |
| **\`:privacy\`** | View Privacy Policy | \`:privacy\` |

### GitHub Integration (Premium)

| Command | Description | Usage |
|---------|-------------|--------|
| **\`:glo\`** | Login to GitHub | \`:glo\` |
| **\`:gou\`** | Logout from GitHub | \`:gou\` |
| **\`:gst\`** | GitHub status | \`:gst\` |
| **\`:gcf\`** | Configure repository | \`:gcf owner repo\` |
| **\`:gpu\`** | Push to GitHub | \`:gpu\` |
| **\`:gsy\`** | Sync with GitHub | \`:gsy\` |

## Themes

Fantasy Editor includes three built-in themes:
- **Light**: Clean, bright interface for daytime writing
- **Dark**: Dark interface for low-light environments  
- **Fantasy**: Purple mystical theme for creative inspiration

Switch themes with \`:t [theme]\` or cycle with \`:tt\`.

## Editor Features

### Width Control
Choose from three optimal writing widths:
- **65ch**: Optimal for reading and focused writing
- **80ch**: Standard coding width
- **90ch**: Wide format for maximum content visibility

### Zoom Control  
Adjust font size from 85% to 130% in discrete steps:
- Use \`:zi\` to zoom in
- Use \`:zo\` to zoom out  
- Use \`:zr\` to reset to 100%

### Document Organization
- **Navigator**: Tabbed sidebar with Documents, Outline, and Search
- **Tags**: Organize documents with custom tags
- **Search**: Full-text search across all documents
- **Export**: Multiple format support for publishing

## Keyboard Shortcuts

The only keyboard shortcut you need to remember:
- **\`Ctrl+Space\`**: Open command palette

Everything else is accessible through commands for consistency and discoverability.

## Getting Help

- Use \`:help\` to open this documentation
- Visit [forgewright.io](https://forgewright.io) for updates
- Report issues on GitHub
- Contact support@forgewright.io for premium support

## Edition Information

Fantasy Editor is available in two editions:

### Community Edition (AGPL v3)
- All core editor functionality
- Local document storage
- Export capabilities  
- Open source and free

### Premium Edition (Commercial License)
- All community features
- GitHub integration and sync
- Cloud storage and backup
- Priority support
- Advanced themes and customization

Use \`:edition\` to check your current edition and \`:upgrade\` for premium information.

---

*Fantasy Editor - Crafted for writers, by writers*`
  }

  /**
   * AGPL v3 License content
   * @private
   */
  getAGPLLicenseContent() {
    return `# GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (c) 2025 Forgewright

This file is part of Fantasy Editor Community Edition.

Fantasy Editor Community Edition is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Fantasy Editor Community Edition is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with Fantasy Editor Community Edition. If not, see <https://www.gnu.org/licenses/>.

## Additional Terms

For commercial licensing options that allow for proprietary use and distribution, please contact:

**Forgewright Licensing**  
Email: licensing@forgewright.io  
Website: https://forgewright.io/commercial

## Commercial Use Clarification

The AGPL v3 license requires that any modifications or derivative works of Fantasy Editor Community Edition must be made available under the same license terms. This includes web services and SaaS applications that use this software.

If you wish to use Fantasy Editor in a proprietary application or service without releasing your source code, you must obtain a commercial license from Forgewright.

## Full License Text

The complete GNU Affero General Public License v3 text is available at:
https://www.gnu.org/licenses/agpl-3.0.html

---

*Fantasy Editor Community Edition - Open source writing software*`
  }

  /**
   * Commercial License content
   * @private
   */
  getCommercialLicenseContent() {
    return `# Fantasy Editor Commercial License

## Premium Edition License Agreement

This Commercial License Agreement ("Agreement") is entered into between you ("Licensee") and Forgewright ("Licensor") for the use of Fantasy Editor Premium Edition.

## License Grant

Subject to the terms and conditions of this Agreement, Licensor grants Licensee a non-exclusive, non-transferable license to use Fantasy Editor Premium Edition.

## Premium Features

The Commercial License includes access to:

### Core Premium Features
- **GitHub Integration**: Full OAuth integration, repository management, and bidirectional sync
- **Cloud Storage**: Secure cloud backup and synchronization across devices
- **Advanced Themes**: Premium theme collection and customization options
- **Priority Support**: Email support with guaranteed response times
- **Enterprise Features**: Single Sign-On (SSO), team management, and admin controls

### Business Benefits
- **No AGPL Restrictions**: Use in proprietary applications without source disclosure requirements
- **Commercial Distribution**: Redistribute and modify for internal or customer use
- **SLA Guarantees**: 99.9% uptime commitment for cloud services
- **Custom Branding**: White-label options for enterprise deployments

## Licensing Models

### Individual License
- Single user license
- All premium features included
- 1 year of updates and support
- Price: $49/year

### Team License
- Up to 25 users
- Shared cloud storage and sync
- Admin dashboard and user management
- Priority support with dedicated account manager
- Price: $199/year

### Enterprise License
- Unlimited users
- On-premises deployment options
- Custom integrations and API access
- SLA guarantees and premium support
- Custom pricing based on requirements

## Restrictions

1. **Redistribution**: May not redistribute the software without explicit permission
2. **Reverse Engineering**: May not reverse engineer, decompile, or disassemble the software
3. **Competitive Use**: May not use the software to create competing products
4. **Transfer**: License is non-transferable without written consent

## Support and Updates

### Included Support
- Email support during business hours (9 AM - 5 PM PST)
- Access to premium documentation and resources
- Software updates and bug fixes for license term
- Migration assistance from Community Edition

### Response Times
- **Individual License**: 2 business days
- **Team License**: 1 business day  
- **Enterprise License**: 4 hours

## Terms and Termination

### License Term
- Annual licenses: 12 months from activation
- Enterprise licenses: Custom term as specified in contract
- Automatic renewal unless cancelled 30 days before expiration

### Termination
- Either party may terminate with 30 days written notice
- Upon termination, Licensee must cease all use and delete all copies
- Prepaid fees are non-refundable except as required by law

## Data and Privacy

### Data Handling
- All user data remains property of Licensee
- Forgewright processes data only as necessary to provide services
- Data is encrypted in transit and at rest
- No data is shared with third parties without consent

### Compliance
- GDPR compliant data processing
- SOC 2 Type II certified infrastructure
- Regular security audits and penetration testing

## Warranty and Liability

### Limited Warranty
Forgewright warrants that the software will perform substantially in accordance with documentation for 90 days from license activation.

### Limitation of Liability
In no event shall Forgewright be liable for indirect, incidental, or consequential damages exceeding the amount paid for the license.

## Contact Information

For licensing inquiries, support, or questions about this agreement:

**Forgewright**  
Email: licensing@forgewright.io  
Support: support@forgewright.io  
Website: https://forgewright.io  
Phone: +1 (555) 123-4567

## Acceptance

By using Fantasy Editor Premium Edition, you acknowledge that you have read, understood, and agree to be bound by the terms of this Commercial License Agreement.

---

*Fantasy Editor Premium Edition - Professional writing software*`
  }

  /**
   * Release Notes content
   * @private
   */
  getReleaseNotesContent() {
    return `# Fantasy Editor Release Notes

## Version 1.0.0 (Current)
*Released: January 2025*

### 🎉 Initial Release

Fantasy Editor 1.0.0 introduces a complete distraction-free markdown editing experience with dual licensing for community and commercial use.

#### ✨ Core Features
- **Keyboard-First Interface**: Complete command palette system with \`Ctrl+Space\` activation
- **Markdown Editor**: CodeMirror 6-powered editor with live preview and syntax highlighting
- **Three Built-in Themes**: Light, Dark, and Fantasy themes for different writing moods
- **Document Management**: Local storage with GUID-based document identification
- **Full-Text Search**: Search across all documents with tag filtering
- **Export System**: Export to Markdown, HTML, PDF, and plain text formats

#### 🎨 Writer-Focused Design
- **Optimal Typography**: Carefully chosen fonts and spacing for comfortable reading
- **Width Control**: 65ch, 80ch, and 90ch width presets for different writing contexts
- **Zoom Control**: 85% to 130% zoom levels for accessibility and preference
- **Distraction-Free**: Clean interface that gets out of your way

#### 🧭 Navigation System
- **Navigator Component**: Tabbed sidebar with Documents, Outline, and Search
- **Auto-hide Functionality**: Mouse-triggered appearance for minimal distraction
- **Document Organization**: RECENT/PREVIOUS grouping with filtering capabilities

#### 📖 Readonly System
- **System Documents**: Built-in help, licensing, and legal documentation
- **Readonly Mode**: Protect documents from accidental edits
- **Document Types**: Distinction between user and system documents

#### ⚖️ Dual Licensing
- **Community Edition**: AGPL v3 licensed with full core functionality
- **Premium Edition**: Commercial license with GitHub integration and advanced features

### 🔧 Technical Improvements
- **IndexedDB Storage**: Reliable local document storage with integrity checking
- **GUID System**: RFC 4122 compliant document identification
- **PWA Ready**: Progressive Web App functionality for offline use
- **Responsive Design**: Mobile-friendly interface with touch support

### 📱 Command System
- **45+ Commands**: Comprehensive command set for all functionality
- **Colon Shortcuts**: Quick access with \`:xx\` pattern (e.g., \`:n\`, \`:s\`, \`:zi\`)
- **Parameter Support**: Commands with arguments and options
- **Fuzzy Search**: Find commands quickly with partial matching

### Premium Features (Commercial License Only)
- **GitHub Integration**: OAuth authentication and repository management
- **Document Sync**: Bidirectional synchronization with GitHub repositories
- **Cloud Storage**: Secure backup and cross-device synchronization
- **Priority Support**: Dedicated support channels with SLA guarantees

---

## Upcoming Features

### Version 1.1.0 (Planned - Q1 2025)
- **Project Gutenberg Integration**: Access to public domain literature
- **Internationalization**: Multi-language support starting with Spanish
- **Advanced Export Options**: Custom PDF styling and batch export
- **Plugin System**: Community-developed extensions and themes

### Version 1.2.0 (Planned - Q2 2025)  
- **Collaboration Features**: Real-time collaborative editing (Premium)
- **Version History**: Document versioning and change tracking
- **Advanced Analytics**: Writing statistics and productivity insights
- **Mobile Apps**: Native iOS and Android applications

### Version 2.0.0 (Planned - Q3 2025)
- **AI Writing Assistant**: Grammar checking and style suggestions (Premium)
- **Advanced Themes**: Community theme marketplace
- **API Access**: Programmatic access for integrations (Enterprise)
- **Advanced Security**: End-to-end encryption options

---

## Community Contributions

Fantasy Editor welcomes community contributions! The Community Edition is open source under AGPL v3.

### How to Contribute
1. **Fork the Repository**: https://github.com/forgewright/fantasy-editor
2. **Follow Coding Standards**: ESLint and Prettier configurations provided
3. **Sign CLA**: Contributor License Agreement required for code contributions
4. **Submit Pull Request**: Detailed review process with maintainer feedback

### Areas for Contribution
- **Themes**: New color schemes and typography options
- **Translations**: Internationalization support for new languages
- **Export Formats**: Additional document export options
- **Accessibility**: Screen reader and keyboard navigation improvements
- **Documentation**: User guides and developer documentation

### Recognition
Contributors are recognized in:
- **CONTRIBUTORS.md** file in the repository
- **About Dialog** in the application
- **Release Notes** for major contributions
- **Community Spotlights** on the Forgewright blog

---

## Migration and Compatibility

### Upgrading from Beta
Fantasy Editor 1.0.0 includes automatic migration from beta versions:
- **Document Compatibility**: All beta documents are automatically converted
- **Settings Preservation**: User preferences and customizations are maintained
- **Export Compatibility**: No breaking changes to export functionality

### Browser Support
- **Chrome**: Version 90 and later
- **Firefox**: Version 88 and later
- **Safari**: Version 14 and later
- **Edge**: Version 90 and later

### System Requirements
- **RAM**: 1GB minimum, 2GB recommended
- **Storage**: 50MB for application, additional for documents
- **Network**: Required for GitHub integration and cloud sync (Premium)

---

## Known Issues and Limitations

### Version 1.0.0 Known Issues
- **Large Documents**: Performance may degrade with documents over 100,000 characters
- **Simultaneous Editing**: No conflict resolution for concurrent edits of same document
- **Export Styling**: PDF export uses default styling only

### Workarounds
- **Large Documents**: Use document splitting for better performance
- **Concurrent Editing**: Manual merge required for conflicting changes
- **PDF Styling**: Use HTML export and print to PDF for custom styling

These issues will be addressed in future releases based on user feedback and prioritization.

---

## Feedback and Support

### Community Support
- **GitHub Issues**: Bug reports and feature requests
- **Community Forum**: https://community.forgewright.io
- **Discord**: Join our writer's community server
- **Documentation**: Comprehensive guides at https://docs.forgewright.io

### Premium Support  
Premium Edition users receive:
- **Priority Email Support**: support@forgewright.io
- **Live Chat**: Business hours support chat
- **Phone Support**: Available for Enterprise customers
- **Dedicated Account Manager**: For Team and Enterprise licenses

---

*Fantasy Editor - Empowering writers with technology*`
  }

  /**
   * EULA content
   * @private
   */
  getEULAContent() {
    return `# End User License Agreement

## Fantasy Editor Service Agreement

Last updated: January 2025

This End User License Agreement ("Agreement") is a legal agreement between you ("User" or "You") and Forgewright ("Company," "We," or "Us") regarding your use of Fantasy Editor software and services.

## 1. Acceptance of Terms

By accessing, downloading, installing, or using Fantasy Editor, you agree to be bound by the terms of this Agreement. If you do not agree to these terms, do not use Fantasy Editor.

## 2. Service Description

Fantasy Editor is a web-based markdown editor designed for distraction-free writing. The service is available in two editions:

### Community Edition
- Open source software licensed under AGPL v3
- Core editing functionality
- Local document storage
- Basic export capabilities
- Community support through public channels

### Premium Edition
- Commercial license with additional features
- GitHub integration and cloud synchronization
- Priority support with guaranteed response times
- Advanced themes and customization options
- Enterprise features and SLA guarantees

## 3. User Account and Data

### Account Registration
- Premium Edition requires account registration
- You are responsible for maintaining account security
- You must provide accurate and current information
- One account per user; sharing accounts is prohibited

### Data Ownership and Privacy
- You retain full ownership of all content you create
- We do not claim ownership rights to your documents or data
- Your data is processed in accordance with our Privacy Policy
- Community Edition: Data stored locally in your browser
- Premium Edition: Data encrypted and stored securely in the cloud

### Data Export and Portability
- You can export your data at any time in standard formats
- No vendor lock-in; your content remains accessible
- Migration tools provided for moving between editions

## 4. Acceptable Use

### Permitted Uses
- Creating, editing, and managing markdown documents
- Personal, educational, and commercial writing projects
- Integration with external services (where supported)
- Customization and theming within provided options

### Prohibited Uses
- Uploading malicious software or harmful content
- Violating intellectual property rights of others
- Harassment, abuse, or inappropriate content
- Attempting to reverse engineer or hack the service
- Commercial redistribution of the software (without commercial license)
- Using the service for illegal activities or spam

### Content Responsibility
- You are solely responsible for content you create or upload
- We reserve the right to remove content that violates this Agreement
- Backup of important content is your responsibility

## 5. Intellectual Property

### Forgewright Rights
- Fantasy Editor software and trademarks are owned by Forgewright
- We retain all rights not expressly granted to you
- Service improvements and updates remain our property

### User Rights
- Community Edition: Rights granted under AGPL v3 license
- Premium Edition: Rights granted under Commercial License Agreement
- You retain ownership of all content you create

### Open Source Components
- Community Edition incorporates open source software
- Full attribution and license information available in the application
- You agree to comply with all applicable open source licenses

## 6. Service Availability and Modifications

### Service Availability
- We strive for high availability but do not guarantee uninterrupted service
- Planned maintenance will be announced in advance when possible
- Community Edition runs locally and is not dependent on our servers
- Premium Edition includes SLA guarantees as specified in commercial terms

### Service Modifications
- We may modify, update, or discontinue features with reasonable notice
- Material changes will be communicated through the application or email
- Continued use after changes constitutes acceptance of modifications

## 7. Payment and Billing (Premium Edition)

### Subscription Terms
- Premium Edition is offered on annual subscription basis
- Payment due in advance for selected term
- Automatic renewal unless cancelled 30 days before expiration
- Price changes will be communicated 60 days in advance

### Refunds and Cancellations
- 30-day money-back guarantee for new subscriptions
- Cancellation effective at end of current billing period
- No refunds for partial months or remaining term (except where required by law)
- Data remains accessible during grace period after cancellation

## 8. Limitation of Liability

### Service Provided "As Is"
- Fantasy Editor is provided without warranties of any kind
- We do not warrant uninterrupted or error-free operation
- You use the service at your own risk

### Limitation of Damages
- Our liability is limited to the amount paid for the service
- We are not liable for indirect, incidental, or consequential damages
- This limitation applies to the maximum extent permitted by law

### Data Loss Protection
- You are responsible for maintaining backups of important content
- While we implement safeguards, we cannot guarantee against all data loss
- Premium Edition includes automatic cloud backup as additional protection

## 9. Privacy and Data Protection

### Information Collection
- We collect only information necessary to provide and improve the service
- Community Edition: Minimal anonymous usage statistics only
- Premium Edition: Account information and usage data as specified in Privacy Policy

### Data Processing
- We comply with applicable data protection laws (GDPR, CCPA, etc.)
- Data is processed lawfully and with appropriate security measures
- You have rights to access, correct, and delete your personal information

### Third-Party Integrations
- GitHub integration (Premium) is subject to GitHub's terms and privacy policy
- Other integrations clearly disclosed with appropriate consent mechanisms

## 10. Termination

### Termination by User
- You may terminate your account at any time
- Deletion request will be processed within 30 days
- Data export available before account closure

### Termination by Forgewright
- We may terminate accounts for violations of this Agreement
- Notice will be provided except in cases of severe violations
- Opportunity to cure violations will be provided where reasonable

### Effect of Termination
- Access to Premium features ceases immediately upon termination
- Community Edition software remains available under AGPL v3
- Data retention period as specified in Privacy Policy

## 11. Legal and Dispute Resolution

### Governing Law
- This Agreement is governed by the laws of [State], United States
- Any disputes will be resolved in the courts of [State]
- UN Convention on Contracts for the International Sale of Goods does not apply

### Arbitration (Optional)
- Disputes may be resolved through binding arbitration by mutual agreement
- Arbitration conducted under American Arbitration Association Commercial Rules
- Each party bears own attorney fees unless award provides otherwise

## 12. Miscellaneous

### Entire Agreement
- This Agreement, along with Privacy Policy and applicable License Agreement, constitutes the entire agreement
- Supersedes all prior communications and agreements
- Modifications must be in writing and agreed to by both parties

### Severability
- If any provision is found unenforceable, remainder of Agreement remains in effect
- Unenforceable provisions will be modified to the minimum extent necessary

### Contact Information
For questions about this Agreement:

**Forgewright**  
Email: legal@forgewright.io  
Address: [Company Address]  
Phone: +1 (555) 123-4567

---

*By using Fantasy Editor, you acknowledge that you have read, understood, and agree to be bound by this End User License Agreement.*`
  }

  /**
   * Privacy Policy content
   * @private  
   */
  getPrivacyPolicyContent() {
    return `# Privacy Policy

## Fantasy Editor Privacy Policy

Last updated: January 2025

Forgewright ("we," "us," or "our") operates Fantasy Editor, a web-based markdown editor for writers. This Privacy Policy explains how we collect, use, and protect your information when you use our service.

## 1. Information We Collect

### Community Edition (Local Use)
- **No Personal Data**: Community Edition runs entirely in your browser
- **Anonymous Analytics**: Basic usage statistics (optional, can be disabled)
  - Feature usage patterns
  - Performance metrics
  - Error reporting (anonymized)
- **Local Storage**: All documents stored in your browser's local storage
- **No Server Communication**: No personal data transmitted to our servers

### Premium Edition (Cloud Service)
- **Account Information**:
  - Email address (for login and communication)
  - Name (optional, for personalization)
  - Password (encrypted, never stored in plain text)
  - Account preferences and settings

- **Document Data**:
  - Content you create and store
  - Document metadata (titles, tags, creation dates)
  - Sync and backup information

- **Usage Data**:
  - Feature usage and interaction patterns
  - Performance and error logs
  - Access times and frequency

- **Integration Data**:
  - GitHub OAuth tokens (encrypted)
  - Repository access permissions
  - Sync status and history

## 2. How We Use Your Information

### Service Provision
- **Account Management**: Creating and maintaining your Premium account
- **Document Sync**: Synchronizing your documents across devices
- **Backup Services**: Providing secure cloud backup of your content
- **Customer Support**: Responding to your questions and support requests

### Service Improvement
- **Analytics**: Understanding how features are used to guide development
- **Performance Optimization**: Identifying and fixing performance issues
- **Security Monitoring**: Detecting and preventing security threats
- **Feature Development**: Building new features based on user needs

### Communication
- **Service Updates**: Important notifications about the service
- **Support Communications**: Responses to your support requests
- **Marketing Communications**: Information about new features (opt-in only)
- **Legal Notifications**: Changes to terms, policies, or legal requirements

## 3. Data Storage and Security

### Data Location
- **Community Edition**: Data stored locally in your browser
- **Premium Edition**: Data stored in secure cloud infrastructure
- **Server Locations**: United States (with EU data residency options available)
- **Data Centers**: SOC 2 Type II certified facilities

### Security Measures
- **Encryption**:
  - Data encrypted in transit using TLS 1.3
  - Data encrypted at rest using AES-256
  - Database encryption with key rotation

- **Access Controls**:
  - Multi-factor authentication for admin access
  - Principle of least privilege for all systems
  - Regular security audits and penetration testing

- **Backup and Recovery**:
  - Automated daily backups with geographic redundancy
  - Point-in-time recovery capabilities
  - Disaster recovery procedures tested quarterly

### Data Retention
- **Active Accounts**: Data retained while account is active
- **Deleted Accounts**: Data permanently deleted within 30 days
- **Legal Requirements**: Some data may be retained longer if required by law
- **Backup Cycles**: Deleted data removed from backups within 90 days

## 4. Data Sharing and Disclosure

### We Do NOT Share Your Data With:
- Advertising networks or data brokers
- Third-party marketing companies
- Social media platforms (unless you explicitly integrate)
- Government agencies (except as legally required)

### Limited Sharing Scenarios:
- **Service Providers**: Trusted partners who help us operate the service
  - Cloud infrastructure providers (AWS, Google Cloud)
  - Customer support tools (with data processing agreements)
  - Payment processors (for subscription management)

- **Legal Requirements**: When required by law or legal process
  - Valid court orders or subpoenas
  - Legal investigations of Terms of Service violations
  - Protection of our rights and safety of users

- **Business Transfers**: In the event of merger or acquisition
  - Users will be notified of any ownership changes
  - Privacy protections will be maintained
  - Option to delete data before transfer

## 5. Your Privacy Rights

### Access and Control
- **Data Access**: Request copies of your personal data
- **Data Correction**: Update or correct inaccurate information
- **Data Deletion**: Delete your account and associated data
- **Data Portability**: Export your data in standard formats

### Communication Preferences
- **Email Settings**: Control marketing and notification emails
- **Analytics Opt-Out**: Disable usage analytics collection
- **Feature Notifications**: Choose which updates you receive

### Geographic Rights
- **GDPR (EU Users)**: Full rights under General Data Protection Regulation
- **CCPA (California Users)**: Rights under California Consumer Privacy Act
- **Other Jurisdictions**: Rights as provided by applicable local laws

## 6. Cookies and Tracking

### Community Edition
- **Essential Cookies**: Session management and preferences only
- **No Tracking**: No advertising or analytics cookies
- **Local Storage**: Used for document storage and app functionality

### Premium Edition
- **Authentication Cookies**: Secure login session management
- **Preference Cookies**: Storing your settings and customizations
- **Analytics Cookies**: Optional usage analytics (can be disabled)
- **No Third-Party Tracking**: We do not allow external tracking scripts

### Cookie Management
- **Browser Controls**: Use browser settings to manage cookies
- **Opt-Out Options**: Disable analytics cookies in application settings
- **Essential Cookies**: Some cookies required for basic functionality

## 7. Third-Party Integrations

### GitHub Integration (Premium)
- **OAuth Authentication**: Secure connection to your GitHub account
- **Repository Access**: Only repositories you explicitly authorize
- **Data Sync**: Document synchronization with authorized repositories
- **Privacy**: Subject to GitHub's privacy policy for integrated features

### Payment Processing
- **Stripe Integration**: Secure payment processing for subscriptions
- **Limited Data**: Only payment information necessary for transactions
- **PCI Compliance**: All payment data handled according to PCI DSS standards

## 8. International Data Transfers

### Data Processing Locations
- **Primary Processing**: United States data centers
- **EU Data Residency**: Available for European users upon request
- **Transfer Safeguards**: Appropriate safeguards for international transfers

### Legal Frameworks
- **Standard Contractual Clauses**: For transfers outside the EU
- **Adequacy Decisions**: Compliant with recognized adequacy decisions
- **Privacy Shield**: Historical framework compliance (as applicable)

## 9. Children's Privacy

### Age Requirements
- **Minimum Age**: 13 years or minimum age in your jurisdiction
- **Parental Consent**: Required for users under 16 in the EU
- **Educational Use**: Special provisions for educational institutions

### Data Protection for Minors
- **Enhanced Protection**: Additional safeguards for users under 18
- **Limited Data Collection**: Minimal data collection for younger users
- **Parental Rights**: Parents can review and request deletion of child's data

## 10. Data Breach Notification

### Our Commitments
- **Rapid Response**: Security incidents investigated within 24 hours
- **User Notification**: Affected users notified within 72 hours
- **Regulatory Reporting**: Authorities notified as required by law
- **Remediation**: Immediate steps taken to prevent further exposure

### User Actions
- **Password Changes**: Recommended after any security incident
- **Account Monitoring**: Check for unauthorized access
- **Support Contact**: Reach out if you suspect unauthorized access

## 11. Changes to This Privacy Policy

### Notification Process
- **Email Notification**: Significant changes communicated via email
- **In-App Notification**: Updates announced in the application
- **Website Posting**: Updated policy posted on our website
- **30-Day Notice**: Material changes with 30-day advance notice

### Continued Use
- **Acceptance**: Continued use constitutes acceptance of changes
- **Opt-Out**: Users may delete accounts if they disagree with changes
- **Version History**: Previous versions available upon request

## 12. Contact Us

### Privacy Questions
For questions about this Privacy Policy or our data practices:

**Privacy Officer**  
Forgewright  
Email: privacy@forgewright.io  
Address: [Company Address]  
Phone: +1 (555) 123-4567

### Data Protection Officer (EU Users)
**DPO Contact**  
Email: dpo@forgewright.io  
Response Time: 5 business days maximum

### Supervisory Authorities
EU users have the right to file complaints with their local data protection authority if they believe we have not properly handled their personal data.

---

*This Privacy Policy is designed to be transparent about our data practices and your rights. We are committed to protecting your privacy while providing an excellent writing experience.*`
  }
}