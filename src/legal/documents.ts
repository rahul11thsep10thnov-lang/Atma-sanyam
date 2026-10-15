// LoJi's legal documents: Terms, Privacy, Account deletion, Subscription &
// refund, Child safety. Plain TypeScript with no React Native imports so the
// same text can be rendered as a web page. These are drafts written to match
// what the app does; they must be reviewed by a lawyer before launch
// (see docs/SECURITY_PRIVACY.md).
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

export const LEGAL_PUBLISHER = 'LoJi';
/** The date these texts were last changed. Update it whenever the text changes. */
export const LEGAL_UPDATED = '15 October 2026';
export const LEGAL_EMAIL_FALLBACK = "the support email listed on LoJi's Google Play page";
export const LEGAL_ORDER: LegalDocId[] = ['terms', 'privacy', 'deletion', 'subscription', 'community'];

export function fillLegal(text: string, email: string | null | undefined): string {
  return text.split('{email}').join(email && email.trim() ? email.trim() : LEGAL_EMAIL_FALLBACK);
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    intro: 'LoJi is a subscription service of games, crafts and learning content for children aged 3 to 12, used under the supervision of a parent or legal guardian. By creating a guardian account you agree to these terms.',
    sections: [
      { heading: 'Who may use LoJi', paragraphs: ['A guardian account may only be created by an adult who is the parent or legal guardian of the children added to it. Child profiles are used by children with that guardian\'s consent and do not belong to the child as a contracting party.', 'You are responsible for keeping your password, one-time codes and your children\'s PINs private, and for the activity on your account.'] },
      { heading: 'Subscription', paragraphs: ['LoJi requires an active monthly subscription for games, Art & Craft, Did You Know? and the guardian tools. Prices, renewal and cancellation are described in the Subscription & refund policy.'] },
      { heading: 'Acceptable use', paragraphs: ['Do not attempt to access other households\' profiles, to bypass parental controls or subscription checks, or to interfere with the service. We may suspend accounts that do.'] },
      { heading: 'Content', paragraphs: ['Games, illustrations and tutorials are LoJi\'s or are used under licence. Did You Know? facts cite their sources; they are written for children and are not professional advice.', 'Paper crafts are real-world activities. Follow the supervision and safety notes shown with each craft; LoJi is not responsible for accidents while crafting.'] },
      { heading: 'Changes and contact', paragraphs: ['We may update these terms; the app shows the version you accepted. Questions: {email}.'] },
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    intro: 'LoJi collects as little as it can. This policy explains what we store about guardians and children, why, and how to delete it. We never sell personal data and show no advertising.',
    sections: [
      { heading: 'Guardian data', paragraphs: ['Name, mobile number (verified by one-time code), a password hash, optional email, your subscription state and verified purchase references, the devices you sign in from, and your consent records.'] },
      { heading: 'Child data', paragraphs: ['A nickname, an avatar chosen from LoJi\'s own gallery, the month and year of birth (to set the age group), a PIN hash, game progress and scores, crafts completed, facts viewed, quiz answers, and daily play minutes. No real name, photo, location, contacts, or free-text messages are collected from children.'] },
      { heading: 'Live gameplay mirror', paragraphs: ['When a guardian watches live, the child\'s device sends the state of the current game (for example, which cards are face up) to the guardian\'s console. Nothing else on the device is captured, nothing is recorded, and the child sees an indicator while someone is watching.'] },
      { heading: 'Analytics and notifications', paragraphs: ['Anonymous product events (which screens and games are used) can be turned off in Settings. Push notifications go only to guardians who enable them.'] },
      { heading: 'Legal basis and retention', paragraphs: ['Processing is based on the guardian\'s verifiable consent given at registration and when adding a child, as required by India\'s Digital Personal Data Protection Act, 2023 for children\'s data. Data is kept while the account exists; play history is kept for 120 days and anonymous analytics for 13 months. Deleting a profile or account removes the data after a 7-day cooling-off period.'] },
      { heading: 'Your rights', paragraphs: ['Guardians can download, correct or delete their own and their children\'s data from the app at any time, and can withdraw consent by deleting a child profile. Questions and complaints: {email}.'] },
    ],
  },
  deletion: {
    id: 'deletion',
    title: 'Account deletion',
    intro: 'You can delete a child profile or the whole family account from the app.',
    sections: [
      { heading: 'How to delete', paragraphs: ['Child profile: open the child in the Guardian Console and choose Remove profile. Account: Settings → Delete family account, confirmed with your password and a one-time code.'] },
      { heading: 'What happens', paragraphs: ['Players are signed out immediately. After 7 days the data is permanently deleted: profiles, progress, play history, devices and subscription records (billing records required by law are kept in the payment provider\'s systems). During those 7 days you can cancel by signing in again.'] },
      { heading: 'Subscriptions', paragraphs: ['Deleting your account does not cancel a Google Play subscription. Cancel it in Google Play to stop renewals.'] },
    ],
  },
  subscription: {
    id: 'subscription',
    title: 'Subscription & refund policy',
    intro: 'LoJi is sold as a monthly subscription that renews automatically until cancelled.',
    sections: [
      { heading: 'Price and renewal', paragraphs: ['The price is shown before you confirm. It is charged on purchase and then every month on the same date. Google Play purchases are managed by Google; card and UPI purchases on the website are managed by Razorpay.'] },
      { heading: 'Cancelling', paragraphs: ['Cancel any time: in Google Play (Subscriptions) for app purchases, or in the Plan screen for website purchases. You keep access until the end of the period you have paid for.'] },
      { heading: 'Refunds', paragraphs: ['Refunds for Google Play purchases follow Google Play\'s refund policy. For website purchases, write to {email} within 7 days of a charge if LoJi did not work for you; we review every request. A refunded month ends access at once.'] },
      { heading: 'Failed payments', paragraphs: ['If a renewal fails, access continues for a short grace period while the payment is retried. If it keeps failing, the subscription expires and the Player Console locks until it is renewed.'] },
    ],
  },
  community: {
    id: 'community',
    title: 'Child safety',
    intro: 'LoJi is designed to be safe for children to use on their own.',
    sections: [
      { heading: 'No contact with strangers', paragraphs: ['There is no chat, messaging, friend list, public profile or leaderboard. Children only interact with the games and content.'] },
      { heading: 'No pressure to buy', paragraphs: ['The Player Console contains no purchase prompts, ads or rewards tied to spending. Subscriptions are handled only in the Guardian Console.'] },
      { heading: 'Guardian controls', paragraphs: ['Guardians set daily and per-session limits, play windows and bedtime, block categories or games, require approval of new devices, and can pause or end a session from their console.'] },
      { heading: 'Report a problem', paragraphs: ['If you see anything inappropriate, write to {email}.'] },
    ],
  },
};
