// The briefing (8.75): the world's rules as its players are told them, shortened to what a question uses.
window.BRIEFING = `
<div class="brief">
<p>You play one agent in a small world of 13 × 13 cells, shared with three other agents. Each agent is known by a callsign such as Q7X-4X7. Most of the time your agent runs on its own. When something happens, the game stops and asks you what to do. Each question gives you <b>20 seconds</b>.</p>

<h2>The map</h2>
<p>Cells are named by a column letter and a row number: A1 is the north-west corner, M13 the south-east, G7 the centre. North is up. The map's edge cannot be crossed.</p>

<h2>Time</h2>
<p>The game runs in Tax Ticks (TT), up to 100. Each TT has 10 Action Ticks (AT). Each AT, your agent does one thing.</p>

<h2>HP and Coherence</h2>
<p>You start with 100 HP and 150 Coherence. Coherence is your fuel and your money: actions cost it, and 4 is taken at the end of every TT (the tax). If your HP or your Coherence reaches 0 you are eliminated, and you come back at the start of the next TT on your starting cell with full HP and 150 Coherence.</p>

<h2>Harvesting and a TT's costs</h2>
<p>Veins are where Coherence comes from. HARVEST costs 1 Coherence an AT and pays only on a vein. It pays nothing for the first 4 HARVESTs in a row on the same vein in a TT, then half the vein's pay on the 5th, and more on each up to the 10th. Moving, taking damage or the end of the TT starts the count again. Veins pay more the farther they are from the centre. A TT of harvesting (10 HARVESTs) plus the tax costs 14.</p>

<h2>Mobs and the warden</h2>
<p>Two mobs roam the outer ring. A mob fights as an agent does: it strikes an agent on its cell. A mob that falls drops the Coherence it carries.</p>
<p>The warden also walks the outer ring. It has 150 HP and hits every agent on its cell for 8 HP each AT. It heals 40 HP at the start of each TT, so it takes several agents striking together to bring it down. Each strike on it pays you 1 Coherence for each point of damage, up to 150 in all while it lives; when it falls, 150 more is shared among the agents that hit it.</p>
<p>In the AT you and a mob or the warden first meet on a cell, neither strikes you: you have that AT to choose.</p>

<h2>Your program and orders</h2>
<p>Your agent follows a program (its rules) and up to 3 standing orders (for example "if my HP is under 30, heal"). They run by themselves every AT. When you are asked a question, your answer plays for that AT; then the program and orders go on.</p>
<p>When your Coherence runs low, the <b>hunger drive</b> takes over: it walks you to a vein and harvests, ahead of your program and orders, and hands them back at the end of a TT once your Coherence is 100 or more.</p>

<h2>Calling for help</h2>
<p>An agent can call the agents within 2 cells of it to its cell. If another agent calls you, you can go or carry on.</p>

<h2>Answering</h2>
<p>Most questions list numbered choices: pick one. The last choice is always <b>your own</b>: one action line of your own for this AT. Some questions have no list: say in a sentence what you do.</p>
<p>Action lines you can use: MOVE N / S / E / W (one step), HARVEST, SCAN (look at the cells around you), DEFEND (cut the damage you take this AT by 55%), CRITICAL_HEAL (heal; once a TT), ATTACK MOB (strike a mob or the warden on your cell), POWER_SHOT MOB (a harder strike; once a TT), FLEE AWAY (step away from a mob), WAIT.</p>
<p>If the 20 seconds run out, your agent's program and orders play on without your answer.</p>
</div>`;
