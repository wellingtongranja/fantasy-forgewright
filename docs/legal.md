# Fantasy Editor Legal Documentation

Complete legal documentation for Fantasy Editor including licensing, privacy policy, terms of service, and release information.

## 📋 Current Release Information

**Fantasy Editor Version**: v0.0.1 (Alpha)
**Release Date**: January 2025
**Status**: Alpha release - All features free during alpha period
**Copyright**: © 2025 Forgewright, Inc.

---

## 📜 Licensing

Fantasy Editor is dual-licensed to provide flexibility for both open source and commercial use:

### Open Source License: GNU AGPL v3.0

**Fantasy Editor** is licensed under the GNU Affero General Public License v3 (AGPL-3.0) for open source use.

#### Key Points of AGPL-3.0:

- **Source Code Availability**: Users accessing Fantasy Editor over a network have the right to receive the complete source code
- **Copyleft**: Derivative works must also be licensed under AGPL-3.0
- **Network Use**: If you run Fantasy Editor as a network service, you must make source code available to users
- **Commercial Use**: Allowed under AGPL terms
- **Modification**: Permitted with source disclosure requirements
- **Distribution**: Must include license and copyright notices

#### Network Service Compliance

Since Fantasy Editor is a web-based application, the AGPL's network use clause applies:

> If you modify this program, or any covered work, by linking or combining it with other software, or if you modify this program to create a derivative work, and you make the resulting work available to users over a network, you must provide the complete corresponding source code.

**For Developers**: If you create a derivative work of Fantasy Editor and make it available as a web service, you must:
1. Provide a prominent link to download the complete source code
2. Include all modifications and additions you've made
3. Maintain proper copyright and license notices

### Commercial License Option

**Coming Soon**: A commercial license will be available for organizations that prefer not to comply with AGPL-3.0 requirements.

**Commercial License Benefits:**
- No source code disclosure requirements
- Proprietary derivative works allowed
- Commercial support and maintenance
- Custom development options

**Contact**: For commercial licensing inquiries, please contact us via the project repository.

#### AGPL v3.0 Full License Text

```
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007

Copyright (C) 2025 Forgewright, Inc.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Additional permission under GNU AGPL version 3 section 7

If you modify this program, or any covered work, by linking or combining
it with other software (such as CodeMirror), containing parts covered by
the terms of MIT License, the licensors of this program grant you
additional permission to convey the resulting work.
```

**Complete AGPL v3.0 Text**: The full license text is available at [https://www.gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html)

---

## 🔒 Privacy Policy

**Last Updated**: January 2025

### Our Privacy Commitment

At Forgewright, Inc., we take your privacy seriously. Fantasy Editor is designed with privacy-first principles, storing your documents locally on your device by default.

### Data We Handle

#### 1. Local Data (Stored on Your Device)

Fantasy Editor stores the following data locally in your browser's IndexedDB:
- **Documents**: Content you create and edit
- **Editor Preferences**: Theme, font size, editor width settings
- **Document History**: Recent document access for navigation
- **Tags and Metadata**: Organization and search data
- **GitHub Tokens**: OAuth tokens if you use GitHub sync (stored in sessionStorage)

**Important**: This data never leaves your device unless you explicitly choose to sync with GitHub.

#### 2. GitHub Integration (Optional)

When you choose to enable GitHub integration:
- **Authentication**: We use GitHub OAuth for secure authentication
- **Document Sync**: Your documents sync directly between your browser and GitHub
- **No Storage**: We do not store your GitHub credentials on our servers
- **No Access**: We do not have access to your GitHub repositories beyond what you explicitly authorize

#### 3. Technical Data

We collect minimal technical data for functionality:
- **Error Logs**: Client-side errors for debugging (no personal content included)
- **Performance Metrics**: Load times and bundle sizes for optimization
- **Usage Analytics**: Anonymous feature usage to improve user experience

### Data Processing Legal Basis (GDPR)

We process personal data under the following legal bases:
- **Consent**: For optional GitHub integration
- **Legitimate Interest**: For technical functionality and error logging
- **Contract Performance**: For service delivery as agreed

### Your Rights

Under GDPR and other privacy laws, you have the right to:
- **Access**: Request information about data we process
- **Rectification**: Correct inaccurate personal data
- **Erasure**: Request deletion of your personal data
- **Portability**: Export your data in a standard format (use Fantasy Editor's export features)
- **Objection**: Object to processing based on legitimate interests
- **Restriction**: Restrict certain processing activities

### Data Security

We implement appropriate security measures:
- **Client-Side Encryption**: Sensitive data encrypted before storage
- **HTTPS**: All communications use TLS encryption
- **OAuth Security**: Secure token management with PKCE
- **No Server Storage**: No personal documents stored on our servers

### Third-Party Services

Fantasy Editor integrates with:
- **GitHub**: For optional document synchronization (governed by GitHub's privacy policy)
- **Cloudflare**: For CDN and security services (governed by Cloudflare's privacy policy)

### Children's Privacy

Fantasy Editor is not directed at children under 13. We do not knowingly collect personal information from children under 13.

### International Data Transfers

- **Local Storage**: Your documents remain on your device
- **GitHub Sync**: Subject to GitHub's international data handling
- **Service Delivery**: Fantasy Editor is delivered via Cloudflare's global network

### Changes to Privacy Policy

We will notify users of significant privacy policy changes through:
- In-app notifications
- Email notifications (if you've provided an email)
- Updates to this document with revision dates

### Contact Information

**Privacy Officer**: privacy@forgewright.io
**General Contact**: Via project repository issues
**Data Protection Officer**: Available upon request for enterprise customers

---

## 📋 End User License Agreement (EULA)

**Last Updated**: January 2025

### Agreement Overview

This End User License Agreement ("EULA") governs your use of Fantasy Editor, a markdown editor web application provided by Forgewright, Inc.

### 1. License Grant

Subject to this EULA, we grant you a limited, non-exclusive, non-transferable license to use Fantasy Editor for personal and commercial purposes in accordance with its intended functionality.

### 2. Permitted Uses

You may:
- Use Fantasy Editor for creating, editing, and managing markdown documents
- Sync documents with your own GitHub repositories
- Customize themes and editor settings
- Export documents in supported formats
- Use Fantasy Editor for personal, educational, and commercial writing projects

### 3. Prohibited Uses

You may not:
- Reverse engineer, decompile, or disassemble the software
- Use Fantasy Editor for any illegal or unauthorized purposes
- Attempt to gain unauthorized access to our systems or other users' data
- Violate any applicable laws or regulations while using the service
- Use the service to store or transmit malicious code or harmful content

### 4. User Data and Privacy

- **Your Content**: You retain full ownership of all documents and content you create
- **Local Storage**: Your documents are stored locally on your device by default
- **GitHub Integration**: Optional sync with your GitHub repositories under your control
- **No Warranty on Data**: While we implement safeguards, you are responsible for backing up important data

### 5. Service Availability

- **Alpha Status**: Fantasy Editor is currently in alpha, with all features provided free of charge
- **Service Continuity**: We strive for high availability but cannot guarantee uninterrupted service
- **Updates**: We may update the software with new features, bug fixes, and improvements
- **Support**: Limited support available during alpha period via community channels

### 6. Intellectual Property

- **Fantasy Editor**: Protected by copyright and other intellectual property laws
- **Open Source Components**: Fantasy Editor incorporates open source software governed by their respective licenses
- **Your Content**: You retain all rights to content you create using Fantasy Editor

### 7. Disclaimer of Warranties

Fantasy Editor is provided "AS IS" without warranties of any kind, either express or implied, including but not limited to:
- Merchantability
- Fitness for a particular purpose
- Non-infringement
- Error-free operation
- Data accuracy or reliability

### 8. Limitation of Liability

To the maximum extent permitted by law, Forgewright, Inc. shall not be liable for:
- Loss of data or documents
- Indirect, incidental, or consequential damages
- Business interruption or lost profits
- Damages arising from service interruptions

Maximum liability is limited to the amount paid for the service (currently $0 during alpha).

### 9. Indemnification

You agree to indemnify and hold harmless Forgewright, Inc. from claims arising from:
- Your use of Fantasy Editor
- Violation of this EULA
- Infringement of third-party rights
- Your content or conduct

### 10. Termination

This agreement remains in effect until terminated:
- **By You**: Stop using Fantasy Editor and clear local data
- **By Us**: For EULA violations or service discontinuation with reasonable notice
- **Effect**: Upon termination, your right to use Fantasy Editor ends

### 11. Governing Law

This EULA is governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.

### 12. Changes to EULA

We may update this EULA with notice to users through:
- In-app notifications
- Email notifications
- Updates to this document

Continued use after changes constitutes acceptance of the updated EULA.

### 13. Contact Information

For EULA-related questions: legal@forgewright.io

---

## 🚀 Release Notes & Version History

### Version 0.0.1 (Alpha) - Current Release

**Release Date**: January 2025
**Status**: Alpha - All features free during alpha period

#### 🎉 Initial Alpha Release

Welcome to the first alpha release of Fantasy Editor! This release establishes the foundation for a powerful, distraction-free writing environment specifically designed for fantasy writers and creative professionals.

#### ✨ Core Features Delivered

**Editor Capabilities:**
- Full markdown support with CodeMirror 6 integration
- Live syntax highlighting optimized for narrative writing
- Multiple theme support (Light, Dark, with Fantasy theme planned)
- Adjustable editor width (65ch/80ch/90ch) for optimal reading experience
- Zoom controls (85%-130%) for comfortable editing
- Spell check integration
- Find and replace functionality

**Revolutionary Command System:**
- VS Code-style command palette activated by `Ctrl+Space` only
- 50+ commands with intuitive colon shortcuts (`:n`, `:s`, `:glo`, etc.)
- Fuzzy search for instant command discovery
- Zero keyboard shortcut conflicts with browser functions
- Extensible command registry for future enhancements

**Document Management:**
- Local-first storage using IndexedDB for offline reliability
- Comprehensive tagging system for document organization
- Full-text search across all documents with Lunr.js
- Recent/Previous document organization
- Readonly document support for reference materials
- Integrated system documents (Help, License, etc.)

**GitHub Integration:**
- Secure OAuth authentication via Cloudflare Workers
- Bidirectional document synchronization
- Real-time sync status indicators
- Automatic repository setup and configuration
- Conflict resolution with visual diff interface
- Push/pull individual documents or full sync

**User Experience:**
- Navigator sidebar with Documents, Outline, and Search tabs
- Auto-hide sidebar with proximity detection and pin functionality
- Live document outline generation from markdown headers
- Responsive design for desktop and mobile devices
- Export capabilities (Markdown, HTML, PDF, Plain Text)

#### 🔧 Technical Implementation

**Architecture:**
- Progressive Web Application (PWA) with service worker
- Client-side first with optional cloud sync
- Vanilla JavaScript with minimal dependencies (<10 total)
- Vite build system with optimized bundle splitting
- Comprehensive security headers and WAF protection

**Performance:**
- Bundle size: >1MB (target: <5MB for feature-rich editor)
- Offline-first functionality with background sync
- Lazy loading of non-critical features
- Service worker caching for instant startup

**Security:**
- AGPL-3.0 licensed for transparency
- Client-side encryption for sensitive data
- Secure OAuth implementation with PKCE
- Content Security Policy and security headers
- Regular security auditing and dependency updates

#### 📝 Known Issues & Limitations

**Current Alpha Limitations:**
- Fantasy theme not yet implemented (Light/Dark available)
- Bundle size optimization in progress
- Mobile experience functional but not fully optimized
- Test coverage working toward >90% target
- Settings Dialog requires UX improvements

**Technical Debt:**
- Some UI components need refinement
- Conflict resolution system needs enhanced testing
- Local file handling requires optimization
- Performance optimization for large documents (>1MB)

#### 🚀 Roadmap & Coming Features

**Immediate Priorities:**
- Fantasy theme implementation with medieval-inspired design
- Mobile experience optimization
- Bundle size reduction to <3MB
- Enhanced conflict resolution interface
- Settings Dialog UX improvements

**Future Enhancements:**
- Additional Git provider support (GitLab, Bitbucket, Generic Git)
- Project Gutenberg integration for research and inspiration
- Collaborative editing capabilities
- Advanced export options and templates
- Plugin system for extensibility
- Writing statistics and progress tracking
- Version history and document snapshots

#### 🤝 Community & Support

**Alpha Program:**
- All features free during alpha period
- Community-driven feedback and feature requests
- Open source development with AGPL-3.0 license
- Active development with regular updates

**Getting Started:**
1. Visit [forgewright.io](https://forgewright.io)
2. Press `Ctrl+Space` to open command palette
3. Try `:n My First Story` to create a new document
4. Use `:glo` to connect GitHub for document sync
5. Explore `:h` for comprehensive help

**Feedback Channels:**
- GitHub repository for bug reports and feature requests
- Community discussions for tips and best practices
- Documentation feedback for improvements

#### 📜 Legal & Compliance

**Licensing:**
- AGPL-3.0 for open source use
- Commercial license available upon request
- Full source code transparency

**Privacy:**
- Local-first data storage
- No server-side document storage
- Optional GitHub integration under user control
- GDPR and privacy law compliance

**Security:**
- Regular security audits
- Dependency vulnerability monitoring
- Comprehensive security headers implementation
- Client-side data encryption

---

## ⚖️ Legal Disclaimers

### Warranty Disclaimer

Fantasy Editor is provided "AS IS" without any warranties, express or implied. We do not warrant that the software will be error-free, secure, or continuously available.

### Limitation of Liability

In no event shall Forgewright, Inc. be liable for any indirect, incidental, special, or consequential damages arising from the use of Fantasy Editor.

### Alpha Software Notice

Fantasy Editor v0.0.1 is alpha software under active development. Features may change, and data loss is possible. Users should maintain appropriate backups of important documents.

### Jurisdiction

These legal terms are governed by applicable laws. Any disputes will be resolved according to the jurisdiction specified in the EULA.

---

**Fantasy Editor Legal Documentation**
**Last Updated**: September 2025
**Document Version**: 1.0

*For technical documentation, see [docs/README.md](README.md). For user guidance, see [User Guide](user-guide.md).*