// URL placeholders - replace with your actual URLs
export const privacyUrl = "/privacy-policy";
export const termsUrl = "/terms-of-service";

export const consentModalText = `By importing your conversation data, you authorize MindVault to process the content to create summaries, extract ideas, and enable search and export. Choose how you want to handle your data below.`;

export const minimalPrivacyPolicy = `
# Privacy Summary — MindVault / AppSmithGPT

We only collect the data you explicitly upload. When you click "Bring My Memory", we store and index the chats you provide to create summaries, extract ideas, and build an encrypted, private index for your search. We do not share your data with third parties except for the external services you explicitly authorize (e.g., Eventbrite to fetch events) — we will ask for permission before doing so. You can delete all data at any time via Account → Delete Data. For full details please see [Full Privacy Policy URL].
`;

export const fullPrivacyPolicy = `
**Privacy Policy for MindVault**

*Last Updated: [Date]*

MindVault ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.

**1. Information We Collect**

We only collect information that you voluntarily provide to us when you use the MindVault application. This includes:

*   **Uploaded Content:** Transcripts, documents, and any text data you upload or paste into the application ("User Content").
*   **Account Data:** If you choose to create an account and use the "Import & Index (Cloud)" feature, we store your User Content associated with your user ID provided by our authentication service.

We do not collect personal information like your name or email address directly. Your authentication is handled by a third-party service, and we only receive a unique, anonymous user ID.

**2. How We Use Your Information**

We use the information we collect solely to:

*   Provide, operate, and maintain the MindVault application.
*   Process your User Content to generate summaries, ideas, and tasks as requested.
*   Store and retrieve your User Content if you use the cloud-based "Import & Index" feature.
*   Improve our services. All AI model training is disabled on your data.

**3. Data Storage and Security**

*   **Local Processing:** If you select "Import Locally Only," your User Content is processed entirely within your browser and is not sent to our servers. Session data may be stored in your browser's localStorage for your convenience.
*   **Cloud Storage:** If you select "Import & Index (Cloud)," your User Content is encrypted in transit and at rest and stored securely in our database (Supabase). We use industry-standard security measures, including Row-Level Security, to ensure that only you can access your data.

**4. Data Sharing**

We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. Your User Content is private and will not be shared with any third party, except as required by law.

**5. Your Data Rights**

You have complete control over your data. You have the right to:

*   **Access:** You can view your stored conversations at any time through the application's history feature.
*   **Deletion:** You can delete individual conversations or your entire data history at any time from within the application. This action is irreversible.

**6. Contact Us**

If you have any questions about this Privacy Policy, please contact us at [Contact Email].
`;

export const fullTermsOfService = `
**Terms of Service for MindVault**

*Last Updated: [Date]*

Please read these Terms of Service ("Terms") carefully before using the MindVault application (the "Service") operated by us.

**1. Acceptance of Terms**

By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.

**2. The Service**

MindVault is a tool designed to help users analyze their conversation transcripts to extract summaries, ideas, and tasks. You can use the service to process data locally within your browser or to store it in a personal, cloud-based account for persistence and history.

**3. User Conduct and Responsibility**

You are solely responsible for the content you upload, process, and store using the Service ("User Content"). You agree not to use the Service to:

*   Upload or transmit any content that is unlawful, harmful, or infringes on any third-party rights (including intellectual property rights).
*   Upload any sensitive information that you are not authorized to possess or share.

**4. Intellectual Property**

You retain full ownership of your User Content. We claim no intellectual property rights over the material you provide to the Service. These Terms do not grant us any licenses or rights to your User Content except for the limited rights needed for us to provide the Service to you.

**5. Disclaimers**

The Service is provided on an "AS IS" and "AS AVAILABLE" basis. While we strive for accuracy, the AI-generated output may contain errors or inaccuracies. You should not rely solely on the output for making critical decisions and should independently verify all information. We disclaim all warranties of any kind, whether express or implied.

**6. Limitation of Liability**

In no event shall MindVault or its operators be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.

**7. Changes to Terms**

We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service within the application.

**8. Contact Us**

If you have any questions about these Terms, please contact us at [Contact Email].
`;
