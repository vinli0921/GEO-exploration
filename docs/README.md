# IRB Documentation

Complete IRB compliance documentation for the LLM Search Behavior Study.

## Overview

This folder contains all necessary documentation for Institutional Review Board (IRB) submission and participant management.

## Files

### IRB_CONSENT_FORM_TEMPLATE.md

Informed consent form template for participants.

**Sections:**
- Study purpose and overview
- Participation requirements
- Data collection details (what is and isn't collected)
- Privacy and data security measures
- Risks and benefits
- Participant rights
- Contact information
- Consent statement

**Customization Required:**
- Insert IRB protocol number
- Add principal investigator name
- Update institution details
- Add research team contact info
- Specify compensation (if any)
- Set data retention period

### PRIVACY_POLICY.md

Comprehensive privacy policy for the Chrome extension.

**Sections:**
- Information collection practices
- Data usage and purposes
- Storage and security measures
- Participant rights and controls
- Third-party services (none used)
- Cookies and local storage
- Children's privacy
- Compliance with regulations
- Data breach protocol
- Contact information

**Customization Required:**
- Update institution name
- Add contact emails/phones
- Specify IRB protocol number
- Update effective dates
- Customize for jurisdiction if needed

### DATA_DICTIONARY.md

Complete reference of all data fields collected.

**Sections:**
- Session data fields and types
- Event types and structures
- Upload metadata
- Database schema documentation
- File storage format
- Data analysis guidelines

**Purpose:**
- IRB review reference
- Researcher documentation
- Data analysis planning
- Privacy compliance verification

### PARTICIPANT_INSTRUCTIONS.md

Step-by-step instructions for study participants.

**Sections:**
- Installation instructions
- Getting started guide
- Using the extension during study
- Privacy features and controls
- Completing the study
- Troubleshooting
- FAQs

**Customization Required:**
- Update distribution method
- Add study-specific instructions
- Update contact information
- Customize for your participant pool

## IRB Submission Checklist

Required for IRB submission:

- [ ] Protocol narrative (describe study purpose, methods)
- [ ] Informed consent form (customize template)
- [ ] Privacy policy (customize template)
- [ ] Recruitment materials
- [ ] Data security plan
- [ ] Data dictionary (reference provided)
- [ ] Participant instructions (customize template)
- [ ] Data retention and destruction plan
- [ ] Conflict of interest disclosure
- [ ] Study team CVs

## Data Collection Details

### What Is Collected

**Behavioral Data:**
- Page visits (URLs, titles, timestamps)
- Navigation patterns
- Clicks, scrolls, form interactions
- Search queries (in search engines/LLMs only)
- Dwell time and session duration

**Technical Context:**
- Browser type and version
- Screen resolution
- Timezone
- Page structure (metadata, links)

### What Is NOT Collected

**Excluded:**
- Names, emails, IP addresses
- Passwords or authentication credentials
- Credit card or payment information
- Social Security numbers
- Content of private messages
- Health information
- Data from excluded domains
- Incognito browsing data

## Privacy Protections

**Anonymization:**
- Participant ID only (no PII)
- No linking to external profiles
- Automatic PII redaction if accidentally captured

**Security:**
- HTTPS encryption for data transmission
- Secure database storage (Supabase)
- Password-protected access
- Regular security updates

**Participant Control:**
- Exclude sensitive websites
- Pause recording anytime
- Stop and withdraw anytime
- Request data deletion

## Compliance

### Regulations

Study complies with:
- IRB regulations for human subjects research (45 CFR 46)
- University data protection policies
- FERPA (if applicable to student data)
- GDPR principles (if applicable)

### Documentation

Maintain records of:
- IRB approval and renewals
- Informed consent (electronic acknowledgment in extension)
- Protocol amendments
- Adverse event reports (if any)
- Data security audits

## Participant Recruitment

### Recruitment Materials

Template language for recruitment:

**Email/Flyer:**
"We are conducting research on how people search for information using AI tools like ChatGPT compared to traditional search engines. Participation involves installing a browser extension that tracks your browsing behavior for [DURATION]. You will receive [COMPENSATION]. All data is anonymous and secure. IRB approved."

**Eligibility:**
- Age 18+
- Regular internet user
- Uses Google Chrome browser
- [Add study-specific criteria]

### Informed Consent Process

1. Participant receives study information
2. Downloads/installs extension
3. Reads consent form in extension popup
4. Enters participant ID (provided by researcher)
5. Checks consent checkbox
6. Clicks "Start Recording" to begin

Electronic consent is recorded with participant ID and timestamp.

## Data Management

### Storage

**During Study:**
- Extension buffers data locally
- Uploads to backend every 5 minutes
- Backend stores in Supabase PostgreSQL
- Raw data saved as compressed JSON files

**Post-Study:**
- Data exported for analysis
- Stored on secure institutional servers
- Retained per IRB requirements (typically 3-7 years)
- Deleted after retention period

### Access Control

**Who Has Access:**
- Principal investigator
- Approved research team members
- IRB (for audits)

**Access Method:**
- Password-protected admin dashboard
- Supabase database (service key required)
- Encrypted connections only

### Data Sharing

**Anonymized Data:**
- May be shared with other researchers
- May be published in academic journals
- May be included in public datasets
- All PII removed before sharing

**Identifiable Data:**
- Never shared outside research team
- Requires additional consent for any sharing

## Risk Assessment

### Minimal Risk Study

Risks are minimal and comparable to everyday browsing:

**Privacy Risk:**
- Mitigated by anonymization
- Participant control over excluded sites
- Secure data transmission and storage

**Psychological Risk:**
- None expected
- No sensitive questions or tasks

**Security Risk:**
- Extension does not access passwords
- No changes to browser security
- Regular security updates

### Adverse Events

Report to IRB if:
- Data breach occurs
- Participant harm reported
- Unexpected privacy concerns arise

## Contact Information

### Research Team

**Principal Investigator:**
- Name: [INSERT NAME]
- Email: [INSERT EMAIL]
- Phone: [INSERT PHONE]

**Study Contact:**
- Email: research@university.edu
- Phone: [INSERT PHONE]

### IRB Office

**Institution IRB:**
- Office: [INSERT OFFICE NAME]
- Email: [INSERT IRB EMAIL]
- Phone: [INSERT IRB PHONE]
- Protocol #: [INSERT PROTOCOL NUMBER]

## Customization Guide

Before IRB submission, customize these templates:

1. **Replace all placeholders** marked with [INSERT...]
2. **Update dates** (effective dates, approval dates)
3. **Specify duration** of study participation
4. **Detail compensation** (if any)
5. **Add institution-specific** language as required
6. **Include local regulations** if applicable
7. **Update contact information** throughout
8. **Review with IRB coordinator** before submission

## Resources

- 45 CFR 46 (Common Rule): https://www.hhs.gov/ohrp/regulations-and-policy/regulations/45-cfr-46/
- OHRP Guidance: https://www.hhs.gov/ohrp/education-and-outreach/
- Belmont Report: https://www.hhs.gov/ohrp/regulations-and-policy/belmont-report/
- GDPR Info: https://gdpr.eu/

## Version History

- Version 1.0 (January 2025): Initial templates created
