-- ============================================================================
-- seed.sql — DEMONSTRATION content (all demo rows are flagged is_demo = true
-- or live in clearly-labeled demo categories. Replace with real catalog data
-- before launch. No real customers/orders/testimonials are created here.)
-- Run AFTER migrations 0001-0003.
-- ============================================================================

-- --------------------------- Site settings ----------------------------------
insert into public.site_settings (key, value) values
('branding', '{
  "businessName": "Your Brand Name",
  "tagline": "Timeless digital wedding invitations",
  "logoPath": null,
  "faviconPath": null,
  "primaryColor": "#B08D57",
  "accentColor": "#6E1E2C",
  "phone": "+91 90000 00000",
  "whatsapp": "919000000000",
  "email": "hello@example.com",
  "address": "Chennai, Tamil Nadu, India",
  "instagram": "", "facebook": "", "youtube": "", "twitter": "",
  "currency": "INR", "country": "IN", "language": "en",
  "websiteTitle": "Your Brand Name — Wedding Invitations",
  "seoDescription": "Premium wedding invitation videos, websites and digital cards.",
  "seoKeywords": "wedding invitation video, wedding website, digital wedding card"
}'::jsonb),
('homepage', '{
  "heroTitle": "Invitations as memorable as the day itself",
  "heroSubtitle": "Handcrafted wedding invitation videos, bespoke wedding websites and elegant digital cards — delivered fast, personalised completely.",
  "heroImagePath": "/images/hero-invitation.jpg",
  "heroVideoUrl": "",
  "heroCtaLabel": "Browse Invitations",
  "heroCtaUrl": "/invitation-videos",
  "heroCta2Label": "Custom Design",
  "heroCta2Url": "/custom-design",
  "announcement": "Wedding season offer: use code WELCOME10 for 10% off your first order",
  "announcementEnabled": true,
  "announcementUrl": "/offers",
  "footerText": "Crafted with love for your special day.",
  "sectionOrder": [
    {"id":"hero","enabled":true},
    {"id":"featured_videos","enabled":true},
    {"id":"featured_websites","enabled":true},
    {"id":"digital_cards","enabled":true},
    {"id":"trending_themes","enabled":true},
    {"id":"new_arrivals","enabled":true},
    {"id":"best_sellers","enabled":true},
    {"id":"offers","enabled":true},
    {"id":"custom_services","enabled":true},
    {"id":"how_it_works","enabled":true},
    {"id":"faqs","enabled":true},
    {"id":"newsletter","enabled":true}
  ]
}'::jsonb),
('regional', '{"currency":"INR","taxRate":0,"country":"IN","language":"en"}'::jsonb)
on conflict (key) do nothing;

-- --------------------------- Categories -------------------------------------
insert into public.categories (name, slug, kind, description, sort_order) values
 ('Traditional Tamil Videos','traditional-tamil','video','Classic Tamil invitation videos with traditional motifs.',1),
 ('Royal Wedding Videos','royal-wedding','video','Regal, palace-inspired wedding video invitations.',2),
 ('Floral Wedding Videos','floral-wedding','video','Soft floral designs with gentle motion.',3),
 ('Minimalist Wedding Videos','minimalist-wedding','video','Clean, modern video invitations.',4),
 ('Cinematic Wedding Videos','cinematic-wedding','video','Film-style storytelling invitations.',5),
 ('Hindu Wedding Videos','hindu-wedding','video','Designs honouring Hindu wedding traditions.',6),
 ('Muslim Nikah Videos','muslim-wedding','video','Elegant Nikah invitation videos.',7),
 ('Christian Wedding Videos','christian-wedding','video','Church wedding invitation videos.',8),
 ('Engagement Videos','engagement','video','Announce your engagement beautifully.',9),
 ('Save the Date Videos','save-the-date','video','Short, shareable save-the-date films.',10),
 ('Reception Videos','reception','video','Invitations for the reception celebration.',11),
 ('Custom Video Service','custom-video','video','Fully custom invitation video design.',12),
 ('Single-Page Websites','single-page-websites','website','One elegant scrolling page.',13),
 ('Multi-Section Websites','multi-section-websites','website','Story, schedule, gallery, RSVP sections.',14),
 ('Animated Websites','animated-websites','website','Motion-rich invitation websites.',15),
 ('Traditional Websites','traditional-websites','website','Classic layouts with traditional detail.',16),
 ('Minimalist Websites','minimalist-websites','website','Clean, modern website designs.',17),
 ('Photo-Gallery Websites','photo-gallery-websites','website','Photo-forward wedding websites.',18),
 ('Event-Schedule Websites','event-schedule-websites','website','Multi-event itineraries.',19),
 ('Custom Websites','custom-websites','website','Fully bespoke website design service.',20),
 ('Traditional Cards','traditional-cards','card','Classic printable-style digital cards.',21),
 ('Floral Cards','floral-cards','card','Floral digital invitation cards.',22),
 ('Royal Cards','royal-cards','card','Regal digital card designs.',23),
 ('Minimalist Cards','minimalist-cards','card','Minimal digital cards.',24),
 ('Save-the-Date Cards','save-the-date-cards','card','Digital save-the-date cards.',25),
 ('Wedding Quotes','wedding-quotes','quote','Quotes and wording for invitations.',26),
 ('Invitation Wording','invitation-wording','quote','Ready-made Tamil & English invitation wording.',27),
 ('Custom Design Services','custom-services','service','Bespoke design services.',28)
on conflict (slug) do nothing;

-- --------------------------- Demo products ----------------------------------
-- All seeded products are DEMO items (is_demo = true) with example pricing.
insert into public.products
 (name, slug, kind, category_id, tags, description, long_description, price_original, price_selling, price_sale,
  customization_enabled, customization_schema, delivery_estimate, revision_policy, license_terms,
  status, is_featured, sort_order, is_demo) values
 ('Royal Tamil Wedding Video','royal-tamil-wedding-video','video',
  (select id from public.categories where slug='traditional-tamil'),
  array['tamil','royal','traditional'],
  'DEMO: A majestic Tamil wedding invitation video with temple-inspired motifs and classical scoring.',
  'DEMO PRODUCT — This demonstration item shows how video products appear. Royal Tamil Wedding Video features a 60–90 second personalised film with couple names, wedding date, venue and family details. Delivered as an MP4 ready for WhatsApp and Instagram sharing.',
  1999, 1499, null, false, '[]', 'Delivered in 3–5 working days', 'Includes 2 free revisions. Extra revisions billed per revision policy.', 'Single wedding use license. Not for resale.',
  'published', true, 1, true),
 ('Floral Cinematic Wedding Video','floral-cinematic-wedding-video','video',
  (select id from public.categories where slug='cinematic-wedding'),
  array['floral','cinematic'],
  'DEMO: Cinematic floral invitation film with soft parallax petals and elegant typography.',
  'DEMO PRODUCT — A cinematic wedding invitation video with layered floral artwork, gentle camera motion and premium typography. Personalised with your names, date and venue.',
  2499, 1999, null, false, '[]', 'Delivered in 3–5 working days', 'Includes 2 free revisions.', 'Single wedding use license.',
  'published', true, 2, true),
 ('Muslim Nikah Invitation Video','muslim-nikah-invitation-video','video',
  (select id from public.categories where slug='muslim-wedding'),
  array['nikah','muslim'],
  'DEMO: An elegant Nikah invitation video with geometric artistry and warm tones.',
  'DEMO PRODUCT — Nikah invitation video with respectful, elegant design. Personalised couple names, Nikah date, venue and family details.',
  1799, 1499, null, false, '[]', 'Delivered in 3–5 working days', 'Includes 2 free revisions.', 'Single wedding use license.',
  'published', true, 3, true),
 ('Christian Wedding Invitation Video','christian-wedding-invitation-video','video',
  (select id from public.categories where slug='christian-wedding'),
  array['christian','church'],
  'DEMO: A graceful church wedding invitation video.',
  'DEMO PRODUCT — Christian wedding invitation video with soft light, candle and floral accents. Personalised with names, ceremony date, church and reception details.',
  1799, 1499, null, false, '[]', 'Delivered in 3–5 working days', 'Includes 2 free revisions.', 'Single wedding use license.',
  'published', false, 4, true),
 ('Premium Wedding Website','premium-wedding-website','website',
  (select id from public.categories where slug='multi-section-websites'),
  array['website','premium'],
  'DEMO: A multi-section wedding website: story, schedule, gallery, venue and RSVP.',
  'DEMO PRODUCT — Premium wedding invitation website with your own shareable link. Sections include welcome, our story, event schedule, gallery, venue map and RSVP. Customise names, photos, colours and fonts from your account.',
  3999, 2999, null, true,
  '[
    {"key":"bride_name","label":"Partner A name","type":"text","required":true,"maxLength":60},
    {"key":"groom_name","label":"Partner B name","type":"text","required":true,"maxLength":60},
    {"key":"wedding_date","label":"Wedding date","type":"date","required":true},
    {"key":"wedding_time","label":"Ceremony time","type":"time"},
    {"key":"venue_name","label":"Venue name","type":"text","required":true,"maxLength":120},
    {"key":"venue_address","label":"Venue address","type":"textarea","maxLength":400},
    {"key":"map_link","label":"Google Maps link","type":"url"},
    {"key":"family_names","label":"Family names","type":"textarea","maxLength":300},
    {"key":"welcome_message","label":"Welcome message","type":"textarea","maxLength":600},
    {"key":"invitation_wording","label":"Invitation wording","type":"textarea","maxLength":800},
    {"key":"bg_color","label":"Background colour","type":"color"},
    {"key":"accent_color","label":"Accent colour","type":"color"},
    {"key":"font_style","label":"Font style","type":"select","options":["serif","sans","modern"]},
    {"key":"music","label":"Background music","type":"select","options":["none","soft-instrumental","traditional"]},
    {"key":"show_countdown","label":"Show countdown","type":"checkbox"},
    {"key":"show_rsvp","label":"Show RSVP form","type":"checkbox"}
  ]'::jsonb,
  'Live within 48 hours of receiving details', 'Unlimited edits for 7 days after delivery.', 'Personal use; hosting included for 1 year.',
  'published', true, 5, true),
 ('Animated Wedding Website','animated-wedding-website','website',
  (select id from public.categories where slug='animated-websites'),
  array['website','animated'],
  'DEMO: A motion-rich wedding website with animated florals and smooth transitions.',
  'DEMO PRODUCT — Animated wedding website template with entrance animations, animated section reveals and a living floral frame. Personalise every supported field from your account dashboard.',
  5999, 4999, null, true,
  '[
    {"key":"bride_name","label":"Partner A name","type":"text","required":true,"maxLength":60},
    {"key":"groom_name","label":"Partner B name","type":"text","required":true,"maxLength":60},
    {"key":"wedding_date","label":"Wedding date","type":"date","required":true},
    {"key":"venue_name","label":"Venue name","type":"text","required":true,"maxLength":120},
    {"key":"welcome_message","label":"Welcome message","type":"textarea","maxLength":600},
    {"key":"bg_color","label":"Background colour","type":"color"},
    {"key":"accent_color","label":"Accent colour","type":"color"},
    {"key":"font_style","label":"Font style","type":"select","options":["serif","sans","modern"]},
    {"key":"show_countdown","label":"Show countdown","type":"checkbox"}
  ]'::jsonb,
  'Live within 72 hours of receiving details', 'Unlimited edits for 14 days after delivery.', 'Personal use; hosting included for 1 year.',
  'published', true, 6, true),
 ('Traditional Digital Wedding Card','traditional-digital-wedding-card','card',
  (select id from public.categories where slug='traditional-cards'),
  array['card','traditional'],
  'DEMO: A classic single-page digital wedding card, ready to share.',
  'DEMO PRODUCT — Traditional digital wedding card (3000×4200px PNG + PDF), personalised with names, date, venue and family details.',
  799, 499, null, true,
  '[
    {"key":"bride_name","label":"Partner A name","type":"text","required":true,"maxLength":60},
    {"key":"groom_name","label":"Partner B name","type":"text","required":true,"maxLength":60},
    {"key":"wedding_date","label":"Wedding date","type":"date","required":true},
    {"key":"venue_name","label":"Venue","type":"text","required":true,"maxLength":120}
  ]'::jsonb,
  'Delivered in 1–2 working days', 'Includes 2 free revisions.', 'Single wedding use license.',
  'published', true, 7, true),
 ('Luxury Digital Wedding Card','luxury-digital-wedding-card','card',
  (select id from public.categories where slug='royal-cards'),
  array['card','luxury','royal'],
  'DEMO: A premium foiled-look digital card with layered ornament work.',
  'DEMO PRODUCT — Luxury digital wedding card with metallic-effect accents, delivered as high-resolution PNG + PDF. Personalisation included.',
  1299, 799, null, true,
  '[
    {"key":"bride_name","label":"Partner A name","type":"text","required":true,"maxLength":60},
    {"key":"groom_name","label":"Partner B name","type":"text","required":true,"maxLength":60},
    {"key":"wedding_date","label":"Wedding date","type":"date","required":true},
    {"key":"venue_name","label":"Venue","type":"text","required":true,"maxLength":120},
    {"key":"accent_color","label":"Accent colour","type":"color"}
  ]'::jsonb,
  'Delivered in 2–3 working days', 'Includes 3 free revisions.', 'Single wedding use license.',
  'published', false, 8, true),
 ('Engagement Invitation Video','engagement-invitation-video','video',
  (select id from public.categories where slug='engagement'),
  array['engagement'],
  'DEMO: A joyful engagement announcement video.',
  'DEMO PRODUCT — 45–60 second engagement invitation video with personalised names, date and venue.',
  1299, 999, null, false, '[]', 'Delivered in 2–3 working days', 'Includes 2 free revisions.', 'Single event use license.',
  'published', false, 9, true),
 ('Save-the-Date Video','save-the-date-video','video',
  (select id from public.categories where slug='save-the-date'),
  array['save-the-date'],
  'DEMO: A short, share-ready save-the-date film.',
  'DEMO PRODUCT — 30 second save-the-date video personalised with your names and wedding date. Perfect for WhatsApp status.',
  899, 699, null, false, '[]', 'Delivered in 1–2 working days', 'Includes 1 free revision.', 'Single event use license.',
  'published', false, 10, true),
 ('Custom Wedding Invitation Website','custom-wedding-invitation-website','website',
  (select id from public.categories where slug='custom-websites'),
  array['custom','website','bespoke'],
  'DEMO: A fully bespoke wedding website designed around your story.',
  'DEMO PRODUCT — Custom-designed wedding website. Our designers work with you one-on-one; layout, colours, fonts and sections built for you. Includes a private shareable link and RSVP management.',
  7999, 5999, null, true, '[]', 'Design starts within 2 working days; typical delivery 5–7 days', '3 structured revision rounds included.', 'Custom work license, single wedding use.',
  'published', false, 11, true),
 ('Premium Custom Video Package','premium-custom-video-package','video',
  (select id from public.categories where slug='custom-video'),
  array['custom','video','package'],
  'DEMO: Two-video package: save-the-date + full wedding invitation film.',
  'DEMO PRODUCT — Package includes one 30s save-the-date video and one 90s personalised wedding invitation video, designed as a matched pair.',
  4499, 3499, null, false, '[]', 'Delivered in 5–7 working days', '3 structured revision rounds included.', 'Single wedding use license.',
  'published', false, 12, true)
on conflict (slug) do nothing;

-- Related products (same family cross-sell)
update public.products p set related_ids = (
  select array_agg(id) from public.products where kind = 'video' and slug <> 'royal-tamil-wedding-video' limit 3
) where slug = 'royal-tamil-wedding-video';
update public.products p set related_ids = (
  select array_agg(id) from public.products where kind = 'website' and slug <> 'premium-wedding-website' limit 3
) where slug = 'premium-wedding-website';

-- --------------------------- Demo themes ------------------------------------
insert into public.themes (name, slug, description, tags, config, is_featured, sort_order, is_demo) values
 ('Ivory Blossom','ivory-blossom','DEMO: Ivory base with pressed-flower corners.',
  array['floral','light'], '{"bg":"#FAF7F1","accent":"#B08D57","font":"serif"}'::jsonb, true, 1, true),
 ('Champagne Royale','champagne-royale','DEMO: Champagne silk with regal crest layout.',
  array['royal'], '{"bg":"#F3EAD9","accent":"#8F6F42","font":"serif"}'::jsonb, true, 2, true),
 ('Burgundy Velvet','burgundy-velvet','DEMO: Deep burgundy panels with gold filigree.',
  array['royal','rich'], '{"bg":"#2B2622","accent":"#B08D57","font":"serif"}'::jsonb, true, 3, true),
 ('Temple Garland','temple-garland','DEMO: Traditional Tamil motifs with marigold accents.',
  array['tamil','traditional'], '{"bg":"#FFFDF8","accent":"#6E1E2C","font":"serif"}'::jsonb, false, 4, true),
 ('Monsoon Garden','monsoon-garden','DEMO: Fresh greens and rain-washed florals.',
  array['floral','fresh'], '{"bg":"#F7F7F2","accent":"#8B9183","font":"sans"}'::jsonb, false, 5, true),
 ('Minimal Muse','minimal-muse','DEMO: Clean typography-first minimal theme.',
  array['minimal'], '{"bg":"#FFFFFF","accent":"#2B2622","font":"modern"}'::jsonb, false, 6, true),
 ('Golden Hour','golden-hour','DEMO: Warm dusk palette with soft gradients.',
  array['warm'], '{"bg":"#FBF3E6","accent":"#B08D57","font":"sans"}'::jsonb, false, 7, true),
 ('Midnight Jasmine','midnight-jasmine','DEMO: Elegant dark theme with jasmine accents.',
  array['dark','elegant'], '{"bg":"#1D1A17","accent":"#D6C2A0","font":"serif"}'::jsonb, false, 8, true)
on conflict (slug) do nothing;

-- --------------------------- Sample quotes ----------------------------------
insert into public.quotes (text, text_ta, author, category, sort_order) values
 ('Two souls, one heart, one beautiful beginning.', NULL, 'Traditional', 'wedding', 1),
 ('Together is a beautiful place to be.', NULL, 'Traditional', 'love', 2),
 ('And so the adventure begins.', NULL, 'Traditional', 'wedding', 3),
 ('And now, these three remain: faith, hope and love.', NULL, 'Scripture (paraphrase)', 'christian', 4),
 ('Two families become one.', NULL, 'Traditional', 'wedding', 5),
 ('A journey of a thousand memories begins with a single invitation.', NULL, 'DEMO sample', 'wedding', 6),
 ('Love is the greatest blessing.', NULL, 'Traditional', 'love', 7),
 ('With joy in our hearts, we invite you to celebrate love.', NULL, 'DEMO sample', 'wording', 8),
 ('காதல் இரு உயிர்களின் இசை.', 'காதல் இரு உயிர்களின் இசை.', 'Tamil traditional', 'tamil', 9),
 ('திருமணம் என்பது இரு குடும்பங்களின் இனிய தொடக்கம்.', 'திருமணம் என்பது இரு குடும்பங்களின் இனிய தொடக்கம்.', 'Tamil traditional', 'tamil', 10),
 ('மனம் நிறைந்த மகிழ்ச்சியுடன் உங்களை அழைக்கிறோம்.', 'மனம் நிறைந்த மகிழ்ச்சியுடன் உங்களை அழைக்கிறோம்.', 'Tamil wording sample', 'tamil', 11),
 ('Graced by family, blessed by friends — join us as we say "I do".', NULL, 'DEMO sample', 'english', 12)
on conflict do nothing;

-- --------------------------- Sample FAQs ------------------------------------
insert into public.faqs (question, answer, category, sort_order) values
 ('How are digital invitations delivered?','Completed videos and cards are delivered as high-resolution downloads and appear in your account. Websites receive a private shareable link.','delivery',1),
 ('How long does delivery take?','Each product lists an estimated delivery time. Most videos deliver in 2–5 working days after we receive your details.','delivery',2),
 ('Can I request changes after delivery?','Yes — every product includes the stated number of free revisions. Additional revisions are billed as listed on the product page.','revisions',3),
 ('How do I customise a wedding website?','After purchase, open My Customizations → choose your template → fill in names, dates, venue and colours → preview → publish to your private link.','customization',4),
 ('Which payment methods are supported?','Razorpay supports UPI, all major Indian cards, net-banking and wallets. Payments are processed securely by Razorpay; we never see your card details.','payment',5),
 ('Do you offer Tamil invitation wording?','Yes. Our Quotes section includes Tamil, and our team can craft custom Tamil wording for any product.','content',6),
 ('Can I get a refund?','Digital products are refundable only before production begins. See the Refund & Cancellation Policy for details.','refunds',7),
 ('Do you make custom designs?','Yes. Choose a Custom Design Service and our designers will work with you one-on-one.','services',8)
on conflict do nothing;

-- --------------------------- Demo coupons & offers ---------------------------
insert into public.coupons (code, kind, value, min_purchase, max_discount, starts_at, expires_at, usage_limit, per_user_limit, first_order_only, applies_to, is_active, description) values
 ('WELCOME10','percent',10,499,500, now() - interval '1 day', now() + interval '90 days', 1000, 1, true, 'all', true, 'DEMO: 10% off first order (min ₹499, max ₹500)'),
 ('FESTIVE200','fixed',200,1499,null, now() - interval '1 day', now() + interval '60 days', 500, 1, false, 'all', true, 'DEMO: ₹200 off orders above ₹1,499')
on conflict (code) do nothing;

insert into public.offer_banners (title, subtitle, cta_label, cta_url, coupon_code, placement, sort_order) values
 ('Wedding Season Sale','Flat ₹200 off invitations above ₹1,499 with code FESTIVE200.','Shop offers','/offers','FESTIVE200','hero_strip',1),
 ('10% off your first order','New here? Use code WELCOME10 at checkout.','Browse videos','/invitation-videos','WELCOME10','banner',2)
on conflict do nothing;

-- --------------------------- Policy pages (templates) ------------------------
insert into public.content_pages (slug, title, body_md) values
 ('privacy-policy','Privacy Policy', $p$## Privacy Policy (Template)

**This is a starting template. The business owner MUST review and adapt it to their actual data practices and applicable law (e.g. the Digital Personal Data Protection Act, 2023) before launch.**

We collect only the information needed to fulfil your order: name, email, phone and the wedding details you provide for personalisation. Payment data is processed by Razorpay; we never see or store card numbers.

We use your information to deliver your order, provide support, and — only with your consent — send marketing communications.

You may request access, correction or deletion of your personal data by contacting support.$p$),
 ('terms','Terms and Conditions', $t$## Terms & Conditions (Template)

**Template — review before launch.**

By purchasing a digital invitation you license it for a single personal event. Redistribution, resale or reuse for other events is prohibited. Delivery estimates begin once complete customer details are received. We may refuse unlawful or offensive content.$t$),
 ('refund-policy','Refund & Cancellation Policy', $r$## Refund & Cancellation Policy (Template)

**Template — review before launch.**

Digital production begins after payment + receipt of details. Orders may be cancelled for a full refund before production starts. Once production has begun, refunds are evaluated case-by-case. Completed and delivered digital products are non-refundable. Approved refunds are processed to the original payment method within 5–7 business days.$r$),
 ('license','Digital Product License', $l$## Digital Product License (Template)

**Template — review before launch.**

Purchased videos, cards and website templates are licensed for one personal wedding event. You may share the finished files/links with guests. You may not resell, redistribute source files, or claim designs as your own work.$l$),
 ('delivery-policy','Delivery & Revision Policy', $d$## Delivery & Revision Policy (Template)

**Template — review before launch.**

Delivery times are shown on each product page and start after we receive complete, correct information. Each product lists its included revisions; extra revisions are chargeable. Deliverables are shared via your account and/or a private link.$d$),
 ('about','About Us', $a$## About Us (Template)

Tell your story here. Replace this template with your studio's history, craft and values from the admin dashboard.

*Demonstration content.*$a$)
on conflict (slug) do nothing;

-- ============================================================================
-- Demonstration artwork shipped with the app (public/images/*.jpg).
-- Admin can replace any of these in Admin → Media Library / product editor.
-- Only fills empty slots, so real uploads are never overwritten.
-- ============================================================================
update public.site_settings
set value = jsonb_set(value, '{heroImagePath}', '"/images/hero-invitation.jpg"'::jsonb)
where key = 'homepage' and (value->>'heroImagePath') is null;

with ranked as (
  select id, kind, row_number() over (partition by kind order by sort_order, name) as rn
  from public.products
  where thumbnail_path is null and kind in ('video', 'website', 'card')
)
update public.products p
set thumbnail_path = case r.kind
      when 'video' then case when r.rn % 2 = 1 then '/images/product-video.jpg' else '/images/product-video-2.jpg' end
      when 'website' then case when r.rn % 2 = 1 then '/images/product-website.jpg' else '/images/product-website-2.jpg' end
      else case when r.rn % 2 = 1 then '/images/product-card.jpg' else '/images/product-card-2.jpg' end
    end
from ranked r
where p.id = r.id;
