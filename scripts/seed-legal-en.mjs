/**
 * Seed English legal pages for editorpdf.net
 * Run with: node scripts/seed-legal-en.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const termsContent = `# Terms of Service

**Effective date:** April 7, 2026

This document establishes the terms and conditions governing the access to and use of the **EditorPDF** platform, available at editorpdf.net (hereinafter, "the Platform"). Any person who accesses the Platform or makes use of its features acquires the status of user and agrees to fully comply with these Terms.

## 1. Platform Description

EditorPDF is a digital document editing solution in PDF format accessible entirely through web browsers. The Platform allows users to modify, annotate, compress, password-protect, electronically sign and convert PDF documents without the need to install additional applications.

## 2. Account Creation and User Responsibility

Access to advanced features requires creating a user account. The user assumes full responsibility for safeguarding their access credentials and for any activity performed from their account. Any indication of unauthorized access should be immediately reported to EditorPDF at support@editorpdf.net.

## 3. Subscriptions and Payment Terms

### 3.1 Initial Trial Period

The service includes a **48-hour trial period** at an initial cost of **0.50 EUR** (taxes included). During this period, the user will have full access to all advanced features.

### 3.2 Recurring Charges

**IMPORTANT NOTICE:** By completing the initial payment of 0.50 EUR, the user **expressly authorizes** EditorPDF to charge **19.99 EUR/month** (taxes included) to the registered payment method once the 48-hour trial period has concluded. This charge will recur monthly until the user cancels their subscription.

### 3.3 Cancellation

The user may cancel their subscription at any time. If cancellation occurs after a billing cycle has started, it will take effect at the end of the already paid period.

### 3.4 Refund Policy

Amounts paid are not subject to refund, except as required by applicable consumer protection regulations (Directive 2011/83/EU).

### 3.5 Pricing

All prices are expressed in euros (EUR) and include applicable VAT. EditorPDF reserves the right to modify prices with at least 30 days' notice via email.

## 4. Responsible Use

The user agrees to use the Platform in compliance with applicable law, refraining from uploading illegal content, attempting unauthorized access, or using automated tools without prior authorization.

## 5. Intellectual Property

All elements of the Platform — including design, source code, logos and content — are the exclusive property of EditorPDF. Documents uploaded by the user remain their exclusive property at all times.

## 6. File Management

Files uploaded by the user are processed solely to provide the requested features. EditorPDF does not access, review or share document content. Temporary files are automatically deleted after processing.

## 7. Limitation of Liability

The Platform is provided "as is" and subject to availability. EditorPDF does not guarantee uninterrupted service or the absence of errors. Total liability shall not exceed the amount paid by the user in the 12 months prior to the claim.

## 8. Amendments

EditorPDF may modify these Terms at any time. Significant changes will be communicated to registered users via email at least 15 days in advance.

## 9. Applicable Law

These Terms are governed by European Union legislation and, subsidiarily, by the laws of Spain. Disputes shall be submitted to the courts corresponding to the consumer's domicile.

## 10. Contact

For any questions regarding these Terms, please contact support@editorpdf.net.`;

const privacyContent = `# Privacy Policy

**Effective date:** April 7, 2026

**EditorPDF** (accessible at editorpdf.net) recognizes the importance of safeguarding the privacy and personal data of its users. This Privacy Policy details the practices relating to the collection, use, retention and protection of personal information.

## 1. Data Controller

The data controller is **EditorPDF**, with digital headquarters at editorpdf.net. Users may direct any inquiry to support@editorpdf.net.

## 2. Data Collected

### 2.1 Information provided by the user
- **Registration data:** full name, email address and authentication credentials.
- **Billing information:** payment method data, managed securely via Stripe.
- **Communications:** information provided through contact forms.

### 2.2 Automatically collected information
- **Browsing data:** pages visited, features used, session duration.
- **Technical data:** IP address, browser type, operating system.
- **Cookies:** as described in our Cookie Policy.

### 2.3 Documents uploaded
PDF files are processed exclusively to provide the requested editing features. EditorPDF does not access or analyze document content for purposes unrelated to service delivery.

## 3. Legal Basis

Data processing is based on: contractual execution (Art. 6.1.b GDPR), user consent (Art. 6.1.a GDPR), legitimate interest (Art. 6.1.f GDPR), and legal obligations (Art. 6.1.c GDPR).

## 4. Use of Personal Data

EditorPDF uses personal data to: manage user accounts, process payments, send operational communications, improve the Platform, prevent fraud, and comply with legal obligations.

## 5. Third-Party Data Sharing

Data may be shared with: **Stripe** (payment processing), **infrastructure providers** (hosting), and **analytics tools** (Platform usage measurement). EditorPDF does not sell personal data.

## 6. International Data Transfers

When data is transferred outside the EEA, EditorPDF ensures appropriate safeguards such as Standard Contractual Clauses approved by the European Commission.

## 7. Retention Periods

- **Account data:** while the account is active and 30 days after deletion.
- **Billing data:** as legally required (generally 5 years).
- **Uploaded documents:** temporary files are deleted after processing; saved files are retained while the subscription is active.

## 8. User Rights

Under the GDPR, users have the right to: access, rectification, erasure, restriction, portability, objection, and withdrawal of consent. To exercise these rights, contact support@editorpdf.net. EditorPDF will respond within 30 calendar days.

## 9. Security Measures

EditorPDF applies appropriate technical and organizational measures including 256-bit SSL/TLS encryption, secure credential storage and access control based on the principle of least privilege.

## 10. Contact

For any queries relating to this Policy, please contact support@editorpdf.net.`;

const cookiesContent = `# Cookie Policy

**Effective date:** April 7, 2026

**EditorPDF** (editorpdf.net) uses cookies and similar tracking mechanisms to optimize the browsing experience, assess Platform performance and adapt content displayed to the user.

## 1. What is a Cookie?

A cookie is a small data file that the web server places on the user's device when visiting a website. Cookies allow the site to remember user preferences and actions.

## 2. Categories of Cookies Used

### 2.1 Essential cookies
Required for the Platform to function correctly. They include session tokens, CSRF protection and cookie consent records.

### 2.2 Analytics cookies
Allow counting visits, identifying traffic sources and measuring Platform performance (Google Analytics).

### 2.3 Preference cookies
Enable advanced personalization features such as language selection and visual theme configuration.

### 2.4 Third-party cookies
EditorPDF integrates services from third parties that may set their own cookies: **Stripe** (payment processing) and **Google Analytics** (statistical analysis).

## 3. Managing Cookies

Users can control cookies through their browser settings. Disabling essential cookies may prevent the Platform from functioning correctly.

## 4. Legal Basis

Essential cookies are based on EditorPDF's legitimate interest. Other cookies require prior user consent under Art. 6.1.a GDPR.

## 5. Contact

For any questions about cookies, please contact support@editorpdf.net.`;

const refundContent = `# Refund Policy

**Effective date:** April 7, 2026

At EditorPDF we want our users to be satisfied with the service. We offer a **7 calendar day refund period** from the date of the first charge.

## 1. Eligibility

This right applies to both the trial period charge (0.50 EUR) and the first monthly subscription charge (19.99 EUR) if it occurs within 7 days of starting the service.

## 2. How to Request a Refund

Send an email to support@editorpdf.net with:
- Subject: "Refund request"
- Email address associated with your account
- Reason for the request (optional)

## 3. Processing Time

We will review and process the refund within **5 to 10 business days**. The refund will be made to the same payment method used for the original purchase.

## 4. Consequences

Upon refund processing:
- Your subscription will be **cancelled immediately**
- You will lose access to premium features
- Stored documents will remain accessible for 30 days

## 5. Exceptions

Refunds will not be granted if: the request is made after 7 days, abusive use is detected, or the account was suspended for Terms violation.

## 6. Legal Right of Withdrawal

In accordance with EU consumer protection regulations, users have the right to withdraw within 14 calendar days. However, this right does not apply once the digital service has begun with the user's express consent.

## 7. Contact

For any refund queries, please contact support@editorpdf.net.`;

const pages = [
  { slug: "terms-en", title: "Terms of Service", content: termsContent },
  { slug: "privacy-en", title: "Privacy Policy", content: privacyContent },
  { slug: "cookies-en", title: "Cookie Policy", content: cookiesContent },
  { slug: "refund-en", title: "Refund Policy", content: refundContent },
];

try {
  for (const page of pages) {
    const [rows] = await db.execute("SELECT id FROM legal_pages WHERE slug = ?", [page.slug]);
    if (rows.length > 0) {
      await db.execute(
        "UPDATE legal_pages SET title = ?, content = ?, updatedAt = NOW() WHERE slug = ?",
        [page.title, page.content, page.slug]
      );
      console.log(`Updated: ${page.slug}`);
    } else {
      await db.execute(
        "INSERT INTO legal_pages (slug, title, content) VALUES (?, ?, ?)",
        [page.slug, page.title, page.content]
      );
      console.log(`Inserted: ${page.slug}`);
    }
  }
  console.log("\nAll English legal pages seeded successfully!");
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await db.end();
}
