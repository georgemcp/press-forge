# Trim Proof Day 2 First-Touch Batch - 2026-06-15

*Status: ready to send manually. No outreach has been sent from this artifact.*

This batch is generated from the Supabase pilot pipeline using `buildPilotFirstTouchBatch(data.pilotLeads, 10)`. It exists so the founder can send the first ten direct touches from an email client and then log actual sends in the admin pipeline.

Do not mark any lead as `contacted` until the email is actually sent. Do not create Hostinger email-marketing contacts from these public-source cold targets unless they opt in or another compliant basis is documented.

## Batch Summary

| # | Company | Segment | Contact | First job | Priority | Subject |
|---|---------|---------|---------|-----------|----------|---------|
| 1 | Quick Print Center Printing & Signs | print_shop | print@quickprintflorida.com | business_card | 88 | Pilot: checked PDF/X proofs for business card jobs |
| 2 | The UPS Store Historic Uptown St. Petersburg | print_shop | store6886@theupsstore.com | flyer | 86 | Pilot: checked PDF/X proofs for flyer jobs |
| 3 | ARC Document Solutions Tampa | print_shop | tampa.laurel.production@e-arc.com | poster | 82 | Pilot: checked PDF/X proofs for poster jobs |
| 4 | AlphaGraphics on Hillsborough | print_shop | us842@alphagraphics.com | postcard | 82 | Pilot: checked PDF/X proofs for postcard jobs |
| 5 | Office Dynamics Tampa | print_shop | phil@officedynamicstampa.com | poster | 80 | Pilot: checked PDF/X proofs for poster jobs |
| 6 | FASTSIGNS Temple Terrace / USF Tampa | print_shop | 302@fastsigns.com | flyer | 78 | Pilot: checked PDF/X proofs for flyer jobs |
| 7 | Dimension Printing | print_shop | chris.brockett@4dimension.com | business_card | 76 | Pilot: checked PDF/X proofs for business card jobs |
| 8 | Zip Mailing Florida | marketing_team | info@zipmailingflorida.com | postcard | 74 | Quick pilot for recurring postcard collateral |
| 9 | Alice June Graphics | designer | sally@alicejune.com | business_card | 72 | Pilot for small business card handoffs |
| 10 | The UPS Store 34th St South St. Petersburg | print_shop | store0107@theupsstore.com | brochure | 72 | Pilot: checked PDF/X proofs for brochure jobs |

## Sending Rules

- Send from a real founder mailbox, one message at a time.
- Review each draft before sending and remove any line that feels unsupported.
- After sending, click `Log sent` in the admin First-touch batch. This records a `first_touch_sent` row in `pilot_outreach_events`, moves the prospect to `contacted`, and sets `last_contact_at`.
- If a prospect replies with no fit, unsupported needs, hostile response, or compliance concern, log a `blocked` or `pilot_declined` outreach event.
- If a prospect agrees to test one real supported job, log a `pilot_agreed` outreach event with the first job type, next step, and any printer spec used before counting them as recruited.

## Message Template

The admin dashboard now shows a copy-ready first-touch batch and mailto draft for each row. Each generated message includes:

- A segment-specific subject.
- The public reason they were selected.
- The likely first supported job.
- The 10-export-credit pilot offer.
- The safety boundary: no guaranteed printer acceptance and no replacement for production judgment.
- A reply prompt asking for the first supported job and printer spec or handoff requirement.

After a founder sends the email, the same dashboard row includes a `Log sent` control. That button does not send email; it only records the manual send in the outreach ledger.

## Day 2 Validation

Before marking Day 2 complete:

- [ ] Ten first touches were actually sent.
- [ ] Every sent row has a `first_touch_sent` row in `pilot_outreach_events`.
- [ ] Every sent row moved from `needs_follow_up` to `contacted`.
- [ ] Every sent row has `last_contact_at`.
- [ ] No Hostinger contact was created unless the recipient opted in.
- [ ] No lead was counted as recruited unless they agreed to test a real supported job and had a next step logged.
