INSERT INTO threads (id, title, body, category, author_id, pinned) VALUES
('seed-0001-repair', 'Battery not charging while driving — where to start?', 'Common one I get on service calls: house battery shows fine at the campsite, but doesn''t seem to charge while you''re driving. Before you assume a bad battery, check these in order:

1. Is your alternator actually wired to the house bank, or only the chassis battery? A lot of older rigs and DIY conversions never had a proper charge line run.
2. If you do have a DC-DC charger (Victron Orion, Renogy DCC, etc.), check it''s getting ignition/engine-run signal — some only activate when they see voltage on a trigger wire, not just because the engine''s on.
3. Check the fuse/breaker on that charge line. It''s the first thing that trips and the last thing people check.
4. Voltage drop over a long chassis-to-house run is real — if your cable run is 15+ feet, undersized wire will choke the charge current even if everything else is correct.

What''s your setup — solar, alternator charging, or both? Happy to help narrow it down.', 'repair', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0002-power', 'Sizing a solar + battery system for full-time off-grid', 'Question I get constantly: "how much solar/battery do I actually need?" Rough rule of thumb before you buy anything:

- Add up your daily DC loads (fridge, fans, lights, water pump, phone/laptop charging) in amp-hours
- Add your inverter loads (anything AC — coffee maker, microwave, CPAP) converted to DC amp-hours at your battery voltage
- That total is your daily consumption — multiply by 1.5-2x for a buffer on cloudy days
- Battery bank should cover 2-3 days of that consumption without any solar input
- Solar array should be able to replace a full day''s usage in about 5-6 hours of decent sun

Victron''s MPPT calculator and a clamp meter for a few days of real usage will get you a much better number than any generic chart. What are you running — and is this a build from scratch or an upgrade to something already installed?', 'power', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0003-connectivity', 'Starlink vs cell booster — do you actually need both?', 'Get asked this a lot on the road. Short answer: they solve different problems, and if you''re full-time in variable terrain, most people end up wanting both eventually.

Cellular booster (weBoost, etc.) amplifies existing signal — if there''s zero bars, a booster can''t create signal from nothing, it just extends usable range from weak-but-present signal. Great for rural areas near towns, bad in truly dead zones (deep canyons, remote forest service roads).

Starlink doesn''t care about cell towers at all — it just needs sky view. Works in places cell boosters never will, but needs a clear view of open sky (dense tree cover is its main weakness) and draws meaningfully more power than a cell setup.

If your travel is mostly established campgrounds and towns: booster first. If you''re chasing remote/dispersed camping: Starlink is closer to mandatory. Where are you usually camping?', 'connectivity', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0004-route', 'Current service corridor + what "case-by-case" actually means', 'Pinning this since it comes up a lot. Active corridor right now is Montana, Wyoming, Idaho, and Washington — that''s where I''m routinely cycling through and can commit to a real appointment window.

Case-by-case states (Michigan, Wisconsin, South Dakota, Minnesota, North Dakota, Oregon) means: if you''re in one of those and it lines up with a planned route, I can often make it work, especially for bigger jobs (full electrical builds, solar installs) worth planning a trip around. Smaller diagnostic-only calls are tougher to justify a long trip for.

Best way to find out: post your location and rough timeline here, or text/call direct at (616) 606-5277. I keep this corridor updated in real time, so what''s live on the site right now reflects where I actually am.', 'route', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 1),

('seed-0005-repair', 'Appliance won''t ignite on propane — quick checklist before a service call', 'Saves everyone time if you check these first — half the "dead" propane appliance calls end up being one of these:

1. Is the tank actually open, and is there propane in it? (Sounds obvious, happens constantly)
2. Air in the line after a tank swap or long period unused — some appliances need a few extra ignition attempts to purge air
3. Igniter battery (many fridges/water heaters have a separate igniter battery from your house battery)
4. Low battery voltage in general — some control boards won''t fire an igniter below a certain voltage threshold even if it seems "fine"
5. Thermocouple or flame sensor dirty/misaligned — common on older units, especially after storage

If you''ve checked all that and it''s still not lighting, that''s when it''s worth a real diagnostic — post what you''ve tried and what appliance/brand and I can help narrow further.', 'repair', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0),

('seed-0006-power', 'Lithium (LiFePO4) vs lead-acid — is it actually worth the upgrade?', 'Get this question on almost every power-system job. Real tradeoffs, no sales pitch:

Lithium pros: roughly 2x usable capacity per rated amp-hour (you can actually use 80-100% vs. ~50% on lead-acid before damaging the battery), way lighter, thousands of cycles vs. hundreds, faster charge acceptance.

Lithium cons: higher upfront cost, needs a battery management system (usually built-in on quality units), most chemistries don''t like charging below freezing without a heating element or cutoff protection — matters if you''re running cold-weather routes.

For anyone full-timing or boondocking regularly, the cycle life and usable capacity usually pay for the price difference over a few years. For occasional weekend use, lead-acid or AGM is often still the more practical call. What''s your usage pattern look like?', 'power', (SELECT id FROM users ORDER BY created_at ASC LIMIT 1), 0);
