<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Seed the platform settings table with the defaults the app relies on.
     */
    public function run(): void
    {
        $defaults = $this->defaults();

        foreach ($defaults as $index => $item) {
            Setting::query()->updateOrCreate(
                ['key' => $item['key']],
                array_merge($item, ['sort_order' => $index]),
            );
        }

        Setting::forgetAllCaches();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function defaults(): array
    {
        return [
            // ---------- Main Settings > Settings & Privacy ----------
            ['group' => 'system', 'key' => 'system:maintenance_mode', 'label' => 'Maintenance Mode', 'type' => 'boolean', 'value' => '0', 'hint' => 'Temporarily pause public access for planned maintenance.', 'is_private' => true],
            ['group' => 'system', 'key' => 'system:patient_signup', 'label' => 'Patient Signup', 'type' => 'boolean', 'value' => '1', 'hint' => 'Allow new patients to register from the public portal.'],
            ['group' => 'system', 'key' => 'system:doctor_auto_review', 'label' => 'Doctor Auto Review', 'type' => 'boolean', 'value' => '0', 'hint' => 'Automatically approve doctors that pass policy checks.'],
            ['group' => 'system', 'key' => 'system:mfa_enforced', 'label' => 'MFA Enforcement', 'type' => 'boolean', 'value' => '1', 'hint' => 'Require OTP or a second factor for all admin logins.'],

            // ---------- Main Settings > Logo & Image ----------
            ['group' => 'brand', 'key' => 'brand:site_name', 'label' => 'Site Name', 'type' => 'text', 'value' => 'Health Care', 'hint' => 'Used in the header, footer, and page titles.'],
            ['group' => 'brand', 'key' => 'brand:tagline', 'label' => 'Tagline', 'type' => 'text', 'value' => 'Wellness made simple', 'hint' => 'Short line shown next to the logo.'],
            ['group' => 'brand', 'key' => 'brand:logo', 'label' => 'Site Logo', 'type' => 'image', 'value' => '', 'hint' => 'Upload a logo image (PNG, SVG, JPG or WEBP).'],
            ['group' => 'brand', 'key' => 'brand:favicon', 'label' => 'Favicon', 'type' => 'image', 'value' => '', 'hint' => 'Small browser tab icon. Leave empty to use the default.'],
            ['group' => 'brand', 'key' => 'brand:description', 'label' => 'Brand Description', 'type' => 'textarea', 'value' => 'We are on a mission to make quality healthcare affordable and accessible for the people of Bangladesh.', 'hint' => 'Shown in the footer.'],

            // ---------- Main Settings > Social Media & Contact ----------
            ['group' => 'social', 'key' => 'social:facebook', 'label' => 'Facebook URL', 'type' => 'url', 'value' => '', 'hint' => 'Leave empty to hide the icon in the footer.'],
            ['group' => 'social', 'key' => 'social:twitter', 'label' => 'Twitter / X URL', 'type' => 'url', 'value' => '', 'hint' => 'Leave empty to hide the icon in the footer.'],
            ['group' => 'social', 'key' => 'social:youtube', 'label' => 'YouTube URL', 'type' => 'url', 'value' => '', 'hint' => 'Leave empty to hide the icon in the footer.'],
            ['group' => 'social', 'key' => 'social:instagram', 'label' => 'Instagram URL', 'type' => 'url', 'value' => '', 'hint' => 'Leave empty to hide the icon in the footer.'],
            ['group' => 'social', 'key' => 'social:linkedin', 'label' => 'LinkedIn URL', 'type' => 'url', 'value' => '', 'hint' => 'Leave empty to hide the icon in the footer.'],
            ['group' => 'social', 'key' => 'social:messenger', 'label' => 'Messenger URL', 'type' => 'url', 'value' => '', 'hint' => 'Leave empty to hide the icon in the footer.'],
            ['group' => 'contact', 'key' => 'contact:phone', 'label' => 'Primary Phone', 'type' => 'text', 'value' => '09611 530 530', 'hint' => 'Main contact number in the footer.'],
            ['group' => 'contact', 'key' => 'contact:hotline', 'label' => 'Hotline / Emergency', 'type' => 'text', 'value' => '01405 600 700', 'hint' => 'Emergency or hotline number.'],
            ['group' => 'contact', 'key' => 'contact:email', 'label' => 'Support Email', 'type' => 'text', 'value' => 'support@healthcare.com', 'hint' => 'Email used across the public pages.'],
            ['group' => 'contact', 'key' => 'contact:address', 'label' => 'Address', 'type' => 'textarea', 'value' => 'Level 8, Health Care Tower, Gulshan-2, Dhaka 1212, Bangladesh', 'hint' => 'Physical address shown in the footer.'],
            ['group' => 'map', 'key' => 'map:enabled', 'label' => 'Show Map', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the location map across the public site.'],
            ['group' => 'map', 'key' => 'map:embed_url', 'label' => 'Map Embed URL', 'type' => 'url', 'value' => '', 'hint' => 'Google Maps embed URL (iframe src).'],
            ['group' => 'map', 'key' => 'map:link', 'label' => 'Get Directions Link', 'type' => 'url', 'value' => '', 'hint' => 'External link such as Google Maps directions.'],
            ['group' => 'map', 'key' => 'map:latitude', 'label' => 'Latitude', 'type' => 'text', 'value' => '23.810331', 'hint' => 'Used by map embeds that need coordinates.'],
            ['group' => 'map', 'key' => 'map:longitude', 'label' => 'Longitude', 'type' => 'text', 'value' => '90.412521', 'hint' => 'Used by map embeds that need coordinates.'],
            ['group' => 'map', 'key' => 'map:address', 'label' => 'Map Address Label', 'type' => 'textarea', 'value' => 'Health Care Tower, Gulshan-2, Dhaka 1212, Bangladesh', 'hint' => 'Address rendered under the map.'],

            // ---------- Return & Refund Policy ----------
            ['group' => 'policy', 'key' => 'policy:return_refund_title', 'label' => 'Return & Refund — Title', 'type' => 'text', 'value' => 'Return & Refund Policy'],
            ['group' => 'policy', 'key' => 'policy:return_refund_slug', 'label' => 'Return & Refund — Slug', 'type' => 'text', 'value' => 'return-and-refund'],
            ['group' => 'policy', 'key' => 'policy:return_refund_enabled', 'label' => 'Return & Refund — Enabled', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Return & Refund Policy link in the footer.'],
            ['group' => 'policy', 'key' => 'policy:return_refund_content', 'label' => 'Return & Refund — Content', 'type' => 'textarea', 'value' => "1. **Eligibility** — We will refund any consultation fee for appointments cancelled at least 24 hours before the scheduled time.\n\n2. **Processing** — Approved refunds are returned to the original payment method within 7–10 working days.\n\n3. **Non-refundable** — Doctor consultation fees for completed sessions and services already delivered are non-refundable.\n\n4. **Requesting a refund** — Contact our support team at the support email listed on this site with your appointment reference number.\n\n5. **Disputes** — Any dispute over a refund is reviewed by the finance team within 3 working days of the request."],
            ['group' => 'policy', 'key' => 'policy:privacy_title', 'label' => 'Privacy — Title', 'type' => 'text', 'value' => 'Privacy Policy'],
            ['group' => 'policy', 'key' => 'policy:privacy_slug', 'label' => 'Privacy — Slug', 'type' => 'text', 'value' => 'privacy-policy'],
            ['group' => 'policy', 'key' => 'policy:privacy_enabled', 'label' => 'Privacy — Enabled', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Privacy Policy link in the footer.'],
            ['group' => 'policy', 'key' => 'policy:privacy_content', 'label' => 'Privacy — Content', 'type' => 'textarea', 'value' => "1. **Data we collect** — We collect the information you provide when creating an account, booking an appointment, or contacting support.\n\n2. **How we use data** — Your data is used to manage appointments, process payments, provide patient care, and improve our services.\n\n3. **Sharing** — We never sell your personal information. Data is shared only with your care team and payment providers as required.\n\n4. **Your rights** — You may request a copy, correction, or deletion of your personal data at any time by contacting support.\n\n5. **Security** — Industry-standard encryption and access controls protect your information."],
            ['group' => 'policy', 'key' => 'policy:terms_title', 'label' => 'Terms — Title', 'type' => 'text', 'value' => 'Terms & Conditions'],
            ['group' => 'policy', 'key' => 'policy:terms_slug', 'label' => 'Terms — Slug', 'type' => 'text', 'value' => 'terms-and-conditions'],
            ['group' => 'policy', 'key' => 'policy:terms_enabled', 'label' => 'Terms — Enabled', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Terms & Conditions link in the footer.'],
            ['group' => 'policy', 'key' => 'policy:terms_content', 'label' => 'Terms — Content', 'type' => 'textarea', 'value' => "1. **Acceptance** — By using this platform you agree to these terms.\n\n2. **Services** — The platform connects patients with healthcare providers for consultations and related services.\n\n3. **Appointments** — Appointments are subject to doctor availability and the cancellation & refund policy.\n\n4. **Liability** — Medical decisions rest with licensed providers. The platform is not a substitute for emergency care.\n\n5. **Changes** — We may update these terms from time to time; continued use means you accept the latest version."],
['group' => 'policy', 'key' => 'policy:cancellation_refund_title', 'label' => 'Cancellation & Refund — Title', 'type' => 'text', 'value' => 'Cancellation & Refund Policy'],
            ['group' => 'policy', 'key' => 'policy:cancellation_refund_slug', 'label' => 'Cancellation & Refund — Slug', 'type' => 'text', 'value' => 'cancellation-refund'],
            ['group' => 'policy', 'key' => 'policy:cancellation_refund_enabled', 'label' => 'Cancellation & Refund — Enabled', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Cancellation & Refund Policy link in the footer.'],
            ['group' => 'policy', 'key' => 'policy:cancellation_refund_content', 'label' => 'Cancellation & Refund — Content', 'type' => 'textarea', 'value' => "1. **Cancellation** — Appointments can be cancelled from your dashboard up to 2 hours before the scheduled slot.\n\n2. **Refunds** — Fees are refunded in full when a doctor or the platform cancels the appointment.\n\n3. **Late cancellation** — Cancellations after the cut-off are charged the standard consultation fee.\n\n4. **Rescheduling** — You may reschedule once at no charge at least 24 hours before the slot."],
            ['group' => 'policy', 'key' => 'policy:no_show_title', 'label' => 'Patient No-Show — Title', 'type' => 'text', 'value' => 'Patient No-Show Policy'],
            ['group' => 'policy', 'key' => 'policy:no_show_slug', 'label' => 'Patient No-Show — Slug', 'type' => 'text', 'value' => 'patient-no-show'],
            ['group' => 'policy', 'key' => 'policy:no_show_enabled', 'label' => 'Patient No-Show — Enabled', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the No-Show Policy link in the footer.'],
            ['group' => 'policy', 'key' => 'policy:no_show_content', 'label' => 'Patient No-Show — Content', 'type' => 'textarea', 'value' => "1. **No-show definition** — A patient who does not attend a confirmed appointment is marked as a no-show.\n\n2. **Repeated no-shows** — Three no-shows in a rolling 90-day period may result in a temporary booking hold.\n\n3. **Waivers** — The policy is waived when a valid emergency or platform-caused disruption is documented."],
            ['group' => 'policy', 'key' => 'policy:account_deletion_title', 'label' => 'Account Deletion — Title', 'type' => 'text', 'value' => 'Account Deletion'],
            ['group' => 'policy', 'key' => 'policy:account_deletion_slug', 'label' => 'Account Deletion — Slug', 'type' => 'text', 'value' => 'account-deletion'],
            ['group' => 'policy', 'key' => 'policy:account_deletion_enabled', 'label' => 'Account Deletion — Enabled', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Account Deletion link in the footer.'],
            ['group' => 'policy', 'key' => 'policy:account_deletion_content', 'label' => 'Account Deletion — Content', 'type' => 'textarea', 'value' => "1. **Requesting deletion** — Email your account deletion request to the support address shown on this site.\n\n2. **Processing** — Most deletion requests are completed within 30 days.\n\n3. **Medical records** — Records may be retained where required by law or for ongoing patient safety.\n\n4. **Data removal** — Personal data is erased and your account can no longer be used to log in."],

            // ---------- Server-Side Tracking ----------
            ['group' => 'tracking', 'key' => 'tracking:google_enabled', 'label' => 'Google Tracking — Enabled', 'type' => 'boolean', 'value' => '0', 'hint' => 'Load Google Analytics / Tag Manager on the public site.'],
            ['group' => 'tracking', 'key' => 'tracking:google_tag_id', 'label' => 'Google Tag ID', 'type' => 'text', 'value' => '', 'hint' => 'e.g. G-XXXXXXXXXX or GTM-XXXXXXX.'],
            ['group' => 'tracking', 'key' => 'tracking:google_measurement_id', 'label' => 'Google Measurement ID', 'type' => 'text', 'value' => '', 'hint' => 'e.g. G-XXXXXXXXXX.'],
            ['group' => 'tracking', 'key' => 'tracking:facebook_enabled', 'label' => 'Facebook Tracking — Enabled', 'type' => 'boolean', 'value' => '0', 'hint' => 'Load the Meta Pixel on the public site.'],
            ['group' => 'tracking', 'key' => 'tracking:facebook_pixel_id', 'label' => 'Facebook Pixel ID', 'type' => 'text', 'value' => '', 'hint' => 'e.g. 1234567890123456.'],

            // ---------- Login Options ----------
            ['group' => 'auth', 'key' => 'auth:google', 'label' => 'Login With Google', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Google login option on the sign-in page.'],
            ['group' => 'auth', 'key' => 'auth:facebook', 'label' => 'Login With Facebook', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Facebook login option on the sign-in page.'],
            ['group' => 'auth', 'key' => 'auth:github', 'label' => 'Login With Github', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the GitHub login option on the sign-in page.'],
            ['group' => 'auth', 'key' => 'auth:linkedin', 'label' => 'Login With Linkedin', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the LinkedIn login option on the sign-in page.'],
            ['group' => 'auth', 'key' => 'auth:twitter', 'label' => 'Login With Twitter', 'type' => 'boolean', 'value' => '1', 'hint' => 'Show the Twitter / X login option on the sign-in page.'],
        ];
    }
}