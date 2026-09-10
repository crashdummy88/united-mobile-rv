INSERT INTO threads (id, title, body, category, author_id, pinned) VALUES
('seed-0007-repair', 'Slide-out stalls or reverses halfway out — where to look first', 'Comes up a lot, especially on older hydraulic and Schwintek-style electric slides. Before assuming a motor or ram is dead, check in this order:

1. Battery voltage under load — slides pull serious current, and a marginal battery that reads fine at rest can sag below the controller''s cutoff the moment the motor engages.
2. Obstruction sensors/limit switches — most modern slides will reverse automatically if they think something''s in the way, even from a switch that''s just dirty or slightly misaligned, not an actual obstruction.
3. On hydraulic slides: fluid level and any visible leaks at the ram seals.
4. On Schwintek (rack-and-pinion) slides: uneven travel side-to-side is usually a sync issue between the two motors, not a single bad motor.

Post the brand/type of slide and exactly where it stalls (inches out, direction) and I can help narrow it down further.', 'repair', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0008-power', 'Inverter shuts off under load but battery shows plenty of charge', 'Classic symptom that points at a few specific causes, not a dead inverter:

1. Voltage sag under load — a battery can show 12.6V resting and still sag to 10.5V the instant a heavy load (microwave, coffee maker, hair dryer) hits it, especially with an undersized or aging bank. Most inverters have a low-voltage cutoff around 10-10.5V for exactly this reason.
2. Undersized or long DC cable run between battery and inverter — voltage drop under load can trip the same cutoff even with a healthy battery.
3. Loose battery terminal or busbar connection — intermittent under load, fine at rest, is the classic signature of a loose/corroded connection heating up and dropping voltage right when you need it.
4. Actual overload — check the load''s starting wattage, not just running wattage. Compressor-based loads (fridge, AC, microwave) can spike 2-3x their rated wattage for a second on startup.

What''s pulling the load when it cuts out, and what''s your battery bank/inverter size?', 'power', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0009-connectivity', 'Peplink router shows connected but pages won''t load', 'This one trips people up because the signal bars look fine. A few things to check before assuming it''s a dead modem:

1. Check which WAN is actually active in InControl/the admin panel — if it failed over to a backup SIM or WiFi-as-WAN source with no real internet behind it, you''ll show "connected" locally with nothing reaching the outside.
2. APN misconfiguration after a SIM swap — some carriers need a manual APN entry, especially with MVNOs or data-only SIMs.
3. Data cap/throttling — some prepaid and unlimited-with-asterisks plans don''t disconnect you, they just throttle to near-zero speed once you hit a threshold.
4. DNS issue rather than a real outage — try loading a raw IP or switching to 1.1.1.1/8.8.8.8 in the router''s DNS settings to rule this out fast.

Which Peplink model, and does the dashboard show the right WAN as active?', 'connectivity', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0010-repair', 'Water pump runs constantly (won''t shut off) even with no fixture open', 'Almost always one of these three:

1. A pinhole leak somewhere in the line — even a tiny one keeps the pressure switch from ever reaching cutoff. Check under sinks, behind the water heater, and along any exposed line for damp spots.
2. Pressure switch itself failing — if you''ve checked for leaks and found none, the switch (or the accumulator tank if you have one) is the next suspect.
3. A fixture that isn''t fully seated — toilet valves and outdoor shower/city-fill check valves are common culprits people forget to check.

Quick test: shut off every valve you can find (including the city-fill and any outdoor shower) and see if the pump still runs. That tells you leak-in-the-system vs. switch/pump problem fast.', 'repair', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0011-power', 'MPPT charge controller shows bulk stage all day, never reaches absorption', 'Means the controller thinks the battery still needs more current than it''s able to deliver — usually one of these:

1. Undersized array for the battery bank — if your panels physically can''t supply enough current to satisfy bulk charging, the controller just stays in bulk indefinitely.
2. Wrong battery profile/voltage settings in the controller — especially common after switching lead-acid to lithium and not updating the absorption voltage target.
3. A parasitic load pulling roughly as much as the panels are producing — the controller sees demand that never lets up, so it never transitions stages.
4. Partial shading on part of the array dragging down total output without you noticing at a glance.

What''s your panel wattage vs. battery bank size, and did you recently change battery chemistry or controller settings?', 'power', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0012-general', 'What''s actually in your rig''s "go bag" for roadside issues?', 'Curious what everyone actually carries versus what they meant to buy and never did. Mine''s built around the calls I get most: a decent multimeter, assorted fuses for both 12V and any inverter-side breakers, a few feet of appropriately-gauged wire and crimp connectors, dielectric grease, and a tire plug kit.

What''s in yours, and what have you actually had to use on the road (versus what''s just taking up space)?', 'general', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0013-repair', 'Furnace blows cold air before finally kicking on — normal or a problem?', 'Get asked this a lot going into colder months. A short delay (10-30 seconds of blower running before you feel heat) is completely normal — that''s the sail switch confirming airflow before the burner''s allowed to ignite, a safety feature, not a fault.

Worth actually checking if: the delay is a full minute or more, it cycles that way every single time rather than just on cold starts, or it never catches at all and just blows cold. Those point at a dirty sail switch, weak igniter, or low battery voltage (furnaces are more voltage-sensitive than people expect since the igniter and fan both draw real current at startup).

How long''s the delay you''re seeing, and is it consistent or getting worse?', 'repair', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0014-blog', 'Why I''m putting real diagnostics and behind-the-scenes stuff here instead of just Instagram', 'Starting to use this space for more than just Q&A — planning to post real diagnostic walkthroughs, van/rig build updates, and the occasional "here''s what a service call actually looked like" writeup, sometimes with video.

Reason''s simple: Instagram and Facebook bury this stuff in a scroll and it''s gone in a day. Here it sticks around, it''s searchable, and if you''ve got the same issue six months from now you can actually find it instead of scrolling through my camera roll of a thousand posts.

If there''s a specific system or job you''d want to see a full walkthrough on, say so below — that''ll shape what goes up first.', 'blog', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 1),

('seed-0015-connectivity', 'weBoost signal booster installed but no improvement — what to check', 'A booster with zero measurable improvement almost always traces back to installation, not a bad unit:

1. Antenna separation — the outside and inside antennas need enough physical distance (and ideally a barrier like a roof or wall between them) or the system will detect oscillation and throttle itself down automatically to prevent feedback.
2. Outside antenna placement — even a few feet of height difference or moving away from metal obstructions (AC units, roof vents) can meaningfully change signal capture.
3. Cable quality/length — cheap or overly long coax between antenna and booster adds real signal loss; low-loss cable rated for the frequency matters more than people expect.
4. Check you''re actually testing against a phone that''s on the same carrier the booster is tuned for — some models are carrier-specific or perform very differently across carriers.

What''s your antenna separation currently, and did signal bars change at all or stay completely flat?', 'connectivity', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0);
