// Tame's legal documents: Terms, Privacy, Account deletion, Subscription &
// refund, Community guidelines. Source: "Tame Legal & User Policies" (draft),
// adjusted to what the app really does today:
//  - no camera / microphone / contacts / location / storage permissions;
//  - profile pictures are chosen from the app's own gallery, never uploaded;
//  - group-focus chat is a fixed set of phrases (no free text), and there are
//    no public posts or leaderboards;
//  - the paid membership and rewarded ads are placeholders (nothing can be
//    bought, no third-party ad is shown);
//  - there is no in-app "report" button yet: reports go by email.
// Plain TypeScript with no React Native imports, so tools/legal/build_legal_html.mjs
// can turn the very same text into the public web page Google Play asks for.
// Keep it matching the app: when a feature changes, change the text here.

export type LegalDocId = 'terms' | 'privacy' | 'deletion' | 'subscription' | 'community';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_PUBLISHER = 'The Summit Seeker';
/** The date these texts were last changed. Update it whenever the text changes. */
export const LEGAL_UPDATED = '12 October 2026';
/** What `{email}` becomes when no support email is configured (EXPO_PUBLIC_SUPPORT_EMAIL). */
export const LEGAL_EMAIL_FALLBACK = 'the support email listed on Tame’s Google Play page';

export const LEGAL_ORDER: LegalDocId[] = ['terms', 'privacy', 'deletion', 'subscription', 'community'];

/** Fill the `{email}` placeholder. */
export function fillLegal(text: string, email: string | null | undefined): string {
  return text.split('{email}').join(email && email.trim() ? email.trim() : LEGAL_EMAIL_FALLBACK);
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  terms: {
    id: 'terms',
    title: 'Terms and Conditions',
    intro: `These Terms govern access to and use of Tame — Tame your time (the “App”), published on Google Play under the developer name ${LEGAL_PUBLISHER}.`,
    sections: [
      {
        heading: '1.1 Acceptance and eligibility',
        paragraphs: [
          'By downloading or using Tame, you agree to these Terms to the extent acceptance is legally valid. If you do not agree, do not use the App.',
          'Tame is intended for people aged 18 or over. Accounts and the social features (friends, pokes, group focus) are for adults only. A younger person may use the focus features on their own device only with the knowledge and consent of a parent or guardian.',
          'Give accurate information when asked (for example a mobile number that is yours), keep your password secure and never share one-time codes. You are responsible for activity through your account except where applicable law provides otherwise.',
        ],
      },
      {
        heading: '1.2 Permitted use and prohibited conduct',
        paragraphs: [
          'Use Tame for personal time management, focus sessions and productivity features. Do not use it unlawfully, interfere with its operation, attempt unauthorised access, distribute malware, exploit bugs, bypass security, or misuse virtual rewards or progress tracking (for example by tampering with the App’s stored data or reporting focus sessions that did not happen).',
          'When you use the social features, do not harass anyone, impersonate others, publish unlawful content in your username or display name, or misuse another person’s personal information. See the Community Guidelines.',
        ],
      },
      {
        heading: '1.3 Features and availability',
        paragraphs: [
          'Tame includes a focus timer with a short grace period for leaving the App, reminders, session history and streaks, virtual plants in a balcony and a garden, jigsaw pictures that reveal as you focus, a museum, coins and a store for decorations and, if you sign in, friends, pokes, notifications and group focus sessions. A paid membership is planned but cannot yet be bought (see the Subscription & Refund Policy).',
          'Some features need an account, internet access or device permissions. We do not guarantee uninterrupted operation, error-free performance, perfect synchronisation, delivery of every notification or compatibility with every device. Timers and alerts may be affected by device settings, battery optimisation, networks, operating systems and third-party services.',
        ],
      },
      {
        heading: '1.4 User content and intellectual property',
        paragraphs: [
          'If you create a username or display name, choose an avatar, or send one of the preset messages in a group focus, you remain responsible for it and must have the right to use it. You give us a limited permission to host, process, display and transmit it as needed to operate the feature, subject to the Privacy Policy and applicable law.',
          'Tame does not let you upload profile pictures or send free-text messages. A photo you pick from your own phone to make a jigsaw stays on your device. Pictures in Tame’s library come from various sources; credits are shown where they are required, and the pictures are provided only for use inside the App.',
          'The App, its software, branding, design, graphics and sounds are owned by or licensed to the operator, except for user and third-party content. You receive a limited, revocable, non-transferable licence to use the App for its intended purpose; no ownership is transferred.',
        ],
      },
      {
        heading: '1.5 Third parties, disclaimer and liability',
        paragraphs: [
          'Tame relies on Google Play and on hosting, database, SMS and email delivery, push notification and similar services. Those services may have separate terms and privacy policies.',
          'To the maximum extent permitted by law, the App is provided “AS IS” and “AS AVAILABLE”. Tame does not guarantee improved concentration, productivity or any particular academic, professional or personal outcome, and is not medical, psychological, therapeutic or emergency advice.',
          'To the maximum extent permitted by law, the operator is not liable for indirect, incidental, special, punitive or consequential loss, including loss of data, profits, goodwill or productivity. Subject to law, aggregate liability may be limited to amounts paid directly to us for the relevant service in the 12 months before the event. If no amount was paid, liability may be limited to zero only where legally permitted. No non-waivable statutory or consumer rights are excluded.',
        ],
      },
      {
        heading: '1.6 Suspension, termination and changes',
        paragraphs: [
          'You may stop using Tame at any time and request account deletion under the Account Deletion Policy. We may suspend access for security, misuse, legal compliance, maintenance or operational reasons. If a paid membership is introduced, it must be cancelled separately through Google Play.',
          'We may update these Terms and will publish a revised version with its date. We will give notice or ask for fresh consent where the law requires it. Continued use signifies acceptance only where legally valid.',
        ],
      },
      {
        heading: '1.7 Indian law and disputes',
        paragraphs: [
          'These Terms are governed by Indian law, subject to mandatory legal protections. Disputes may be brought before competent courts or consumer forums with jurisdiction under applicable law. Contacting support in good faith may be tried first but does not prevent statutory remedies. If a provision is invalid it is severed to the minimum extent necessary; the rest remains effective.',
          `Contact: ${LEGAL_PUBLISHER}, publisher of Tame. Email: {email}.`,
        ],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    intro: 'This policy describes how the person or entity operating Tame (“we”) handles personal data in the App as it works today.',
    sections: [
      {
        heading: '2.1 Operator and data collected',
        paragraphs: [
          `Tame is published on Google Play under the developer name ${LEGAL_PUBLISHER}. The person or entity deciding the purposes and means of processing is responsible as the Data Fiduciary where that concept applies under Indian law.`,
          'Kept only on your device (not sent to us): your focus history, streaks and coins; your balcony, garden and museum; your preferences and language; and any photo you pick from your phone to make a jigsaw (through the system photo picker, which gives Tame only the photo you choose).',
          'If you sign in: your mobile number (or an email address, for older accounts); your password, stored only as a one-way hash; a username; an optional display name; the avatar you chose; and your privacy settings (allow pokes, findable by mobile number).',
          'If you use the social features: your friend requests, friends and blocks; pokes; notifications; whether you are online, focusing or in a group; your focus sessions as the server saw them (start time, planned length, outcome and the minutes credited); and the group focus sessions you take part in (the plan, who took part, their status and the preset chat messages).',
          'Technical information: a random install identifier, app version and platform; a push token if you turn on notifications; your IP address, used for security and rate limiting; and anonymous usage events (screens opened, sessions started or completed, library pictures chosen, errors) if you leave “Share usage analytics” on in Settings → Privacy.',
          'One-time sign-in codes are sent by SMS; we keep only a hash of each code, briefly.',
          'Tame asks for the notification permission only if you turn on reminders or announcements. It does not request camera, microphone, contacts, location or storage permissions.',
        ],
      },
      {
        heading: '2.2 Purposes and legal basis',
        paragraphs: [
          'We use data to provide timers and progress tracking; create and secure accounts and sign you in; show your friends your presence and verified focus time; deliver pokes, notifications and group focus sessions; send reminders; provide support; verify that completed sessions really ran their full length; prevent fraud and abuse; diagnose errors and improve features; comply with law; and establish or defend legal claims. Tame currently shows no third-party advertising.',
          'We will seek consent where required by applicable law and rely on another lawful basis only where available. You may withdraw consent for consent-based processing through the available settings (for example analytics and notifications in Settings) or by contacting us. Withdrawal does not affect prior lawful processing and may limit features that depend on the data.',
        ],
      },
      {
        heading: '2.3 Sharing and international transfers',
        paragraphs: [
          'With other Tame users: your username, display name and avatar. If you are friends, they also see whether you are online, focusing or in a group, and how your verified focus time this week compares with theirs. Your mobile number is never shown to other users: someone can find you by typing your exact number only if you leave “Findable by mobile number” on, and they then see only your username and avatar.',
          'With service providers who help us run Tame: hosting and database providers; an SMS delivery provider that sends sign-in codes; an email delivery provider for password resets of older email accounts; Expo’s push notification service and the Apple and Google notification gateways; and Google Play. We may disclose data to professional advisers or competent authorities where the law requires. We do not sell personal data.',
          'Some providers may process data outside India. Transfers are handled subject to applicable Indian law and any restrictions or safeguards in force.',
        ],
      },
      {
        heading: '2.4 Retention, rights and security',
        paragraphs: [
          'We keep data only as long as reasonably necessary for its purpose, subject to legal obligations. Account and social data are kept while your account is active and removed when you delete it (see the Account Deletion Policy). One-time sign-in codes are removed within about a day. A sign-in lasts up to 30 days and renews while you use the App. Anonymous usage events are kept for up to about 13 months. Data no longer needed is deleted or anonymised, subject to lawful retention and backup limits.',
          'Subject to applicable law, you may ask for information about processing, correction, erasure where available, withdrawal of consent and grievance redressal, and exercise other applicable rights. Contact {email}. We may verify your identity and will respond within applicable timelines.',
          'We use reasonable technical and organisational security measures: passwords, one-time codes and session tokens are stored hashed; communication uses HTTPS; access to administration is restricted; and requests are rate limited. No system is perfectly secure. We will address breaches and notify individuals or authorities where the law requires.',
        ],
      },
      {
        heading: '2.5 Children, ads and third parties',
        paragraphs: [
          'Tame is intended for people aged 18 or over. We do not knowingly collect personal data from children. If you believe a child has created an account, contact us and we will delete it.',
          'Tame does not currently show third-party advertising or use advertising identifiers. If that changes, we will update this policy and the Google Play Data safety information first.',
          'External websites and services are governed by their own policies. We remain responsible for our own data handling to the extent required by law.',
        ],
      },
      {
        heading: '2.6 Updates and contact',
        paragraphs: [
          'We may update this policy as features, integrations or laws change. We will publish the updated version with its date and seek consent or give notice where required.',
          `Contact: ${LEGAL_PUBLISHER} / Tame; email {email}.`,
        ],
      },
    ],
  },

  deletion: {
    id: 'deletion',
    title: 'Account Deletion Policy',
    intro: 'This policy explains how to delete your Tame account and what happens to your data.',
    sections: [
      {
        heading: '3.1 How to request deletion',
        paragraphs: [
          'In the App: Settings → Account → Delete account. If your account has a password you will be asked for it. Deletion in the App takes effect at once.',
          'If you cannot use the App, email {email} with the subject “Tame Account Deletion Request”, from the email address on the account or naming the mobile number of the account. These instructions are also published on the web page linked from Tame’s Google Play listing. Never send passwords or one-time codes.',
        ],
      },
      {
        heading: '3.2 Verification and deletion scope',
        paragraphs: [
          'For requests made outside the App we may reasonably verify that you are the account holder.',
          'Deleting your account removes your mobile number, email address, username, display name, avatar choice and password hash; your sign-ins on all devices; the friendships, friend requests and blocks you made or received; your pokes and notifications; your focus session records; your part in group focus sessions and your preset chat messages; and the group focus sessions you hosted, which end for everyone in them. Your device’s notification registration is detached from your account. Anonymous usage events are kept but are no longer linked to you.',
          'Data stored only on your device (your focus history, plants, museum and coins) is not on our servers: clear it with Settings → Your data → Clear history, by clearing the App’s data in your phone settings, or by uninstalling. Uninstalling alone does not delete information on our servers.',
        ],
      },
      {
        heading: '3.3 Permitted retention and subscriptions',
        paragraphs: [
          'Limited information may be kept where necessary for legal compliance, transaction records, fraud prevention, security, dispute resolution or enforcement, as the law permits. Backups may take a reasonable period to expire and are not restored to active use except for recovery or lawful purposes.',
          'Deleting an account does not cancel a Google Play subscription. When a paid membership exists, cancel it separately in Google Play. Refunds are governed by the Subscription & Refund Policy.',
        ],
      },
      {
        heading: '3.4 Confirmation and contact',
        paragraphs: [
          'Where practicable, we will confirm that deletion is complete or explain why certain data must be kept. Requests: {email}. We process requests within applicable legal and platform timelines.',
        ],
      },
    ],
  },

  subscription: {
    id: 'subscription',
    title: 'Subscription & Refund Policy',
    intro:
      'Tame is free to use today. An ad-free monthly membership, shown in Settings → Membership, is planned but cannot yet be bought: nothing is charged and no payment details are collected. This policy describes how paid features will work when they are released.',
    sections: [
      {
        heading: '4.1 Pricing and paid features',
        paragraphs: [
          'Tame may offer free and paid features. The planned membership turns off the optional rewarded ads. Availability may vary by version, region and platform. Price, currency, billing period, taxes, trial length and benefits will be shown before you buy. The checkout display governs the transaction.',
        ],
      },
      {
        heading: '4.2 Billing and auto-renewal',
        paragraphs: [
          'Subscriptions bought through Google Play are billed and managed under Google Play’s terms. Unless checkout states otherwise, a subscription may renew automatically at the end of each billing period until cancelled. A trial may convert to a paid subscription at the disclosed price unless cancelled before the stated deadline.',
        ],
      },
      {
        heading: '4.3 Cancellation',
        paragraphs: [
          'Cancel through Google Play subscription settings. Cancellation generally prevents the next renewal; access usually continues until the end of the paid period, subject to platform terms and law. Uninstalling the App, signing out or deleting your account does not cancel a subscription.',
        ],
      },
      {
        heading: '4.4 Refunds',
        paragraphs: [
          'Cancellation does not automatically entitle you to a refund. To the maximum extent permitted by law and platform policy, fees already paid are non-refundable except where the law requires a refund or one is approved under the applicable policy. For Google Play purchases, ask through Google’s refund process; we cannot guarantee approval.',
          'If we ever process a payment directly, email {email} with the transaction reference. Do not send full card numbers or passwords. Nothing here removes non-waivable rights under Indian consumer law.',
        ],
      },
      {
        heading: '4.5 Failed payments, virtual items and changes',
        paragraphs: [
          'If a payment fails, the platform may retry the charge or suspend paid access under its rules. Material changes to paid features will be handled in line with applicable law and platform policy. Taxes and currency conversion are as shown by the billing platform.',
          'Plants, coins, jigsaws, decorations and other items in Tame are digital in-app benefits earned by focusing. Unless expressly stated otherwise they have no cash value and cannot be redeemed, sold or transferred outside the App. They are stored on your device, so they can be lost if you clear the App’s data or uninstall it.',
        ],
      },
      {
        heading: '4.6 Support',
        paragraphs: ['For subscription questions, email {email} with the product name, purchase date and transaction reference if you have one. Check your Google Play purchase history and subscription settings for current status and cancellation options.'],
      },
    ],
  },

  community: {
    id: 'community',
    title: 'Community Guidelines',
    intro:
      'These guidelines apply to Tame’s social features: usernames and avatars, friend requests, pokes, notifications and group focus sessions with preset chat messages. Tame has no free-text messaging, public posts or leaderboards.',
    sections: [
      {
        heading: '5.1 Respectful conduct',
        paragraphs: [
          'Treat others respectfully. Harassment, bullying, threats, stalking, hate-based attacks, targeted abuse and repeated unwanted contact are not allowed. Using pokes or friend requests to pester someone is repeated unwanted contact.',
        ],
      },
      {
        heading: '5.2 Unlawful or harmful content',
        paragraphs: [
          'Do not use a username or display name that is unlawful, fraudulent, threatening, exploitative or invades someone’s privacy. Do not publish another person’s personal information without a lawful basis and their permission.',
        ],
      },
      {
        heading: '5.3 Authenticity and manipulation',
        paragraphs: [
          'Do not impersonate others, misrepresent your identity to deceive, fabricate focus sessions or rewards, tamper with the App or its server to change the focus time your friends see, use bots to evade limits, or create accounts to bypass restrictions.',
        ],
      },
      {
        heading: '5.4 Spam, scams and intellectual property',
        paragraphs: [
          'Do not spam people with requests, pokes or invitations, distribute malware, share phishing links, promote scams or use social features for unauthorised advertising. Share only content you own or are authorised to use. Copyright or content complaints may be sent to {email} with enough information to identify the material.',
        ],
      },
      {
        heading: '5.5 Reporting, blocking, moderation and appeals',
        paragraphs: [
          'You are in control of who can reach you. On the Friends tab, tap a friend’s name and choose Block: blocking ends the friendship and stops requests, pokes and group invitations between you. In Settings → Account → Edit profile you can turn off pokes and stop being found by your mobile number.',
          'There is no in-app report button yet. To report someone, email {email} with their username and what happened. We may review reports and restrict features, hide profiles, suspend accounts or terminate them, depending on severity, evidence, safety, applicable law and platform requirements. Serious threats, exploitation, fraud or unlawful content may need urgent action.',
          'Where practicable, we will explain what we did and offer an appeal: email {email} with your username and the relevant context. Reinstatement is not guaranteed.',
        ],
      },
      {
        heading: '5.6 Privacy and safety',
        paragraphs: [
          'Tame never asks for your password or a one-time code. Do not share passwords, one-time codes, financial account information or sensitive personal details with anyone. Use the privacy controls and report suspected account compromise.',
          'Information visible to other users, such as your username, avatar and presence, may be copied or disclosed by them; do not assume it stays confidential. We take reasonable moderation steps but cannot guarantee that everything is noticed at once. Users remain responsible for their own conduct, subject to applicable law.',
        ],
      },
    ],
  },
};
