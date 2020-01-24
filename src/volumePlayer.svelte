<script>
    import { fade } from 'svelte/transition';
    export let array;
    export let list;
    export let inGame;
    export let click;
</script>

<style>
	::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	::-webkit-scrollbar-button {
		width: 0px;
		height: 0px;
	}
	::-webkit-scrollbar-thumb {
		background: #ca314a;
		border: 0px none #ffffff;
		border-radius: 0px;
	}
	::-webkit-scrollbar-track {
		background: #0d0d0d;
		border: 0px none #ffffff;
		border-radius: 0px;
	}
	::-webkit-scrollbar-corner {
		background: transparent;
	}
    p {
		margin: 0;
		margin-left: 1%;
    	font-family: TTNorms-Regular;
		color: #bcbcbc;
		letter-spacing: 0.02em;
		font-size: 1.1em;
		white-space: nowrap;	
	}
	input, button {
    	outline: none;
	}
    button {
        text-decoration: none;
		padding: 0 3%;
		height: 26px;
		border-radius: 11px;
		font: 0.8em TTNorms-Regular;
		color: #FFFFFF;
		background: radial-gradient(circle, #ff2a4a 0%, #eb2e4a 100%);
		border: solid 1px #eb2e4a;
		cursor: pointer;
        box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
    }
    th {
		display: flex;
		align-items: center;
		min-width: 9vh;
        margin-left: auto;
	}
    p {
		width: 27px;
		margin-left: 1vh;
		font-family: TTNorms-Regular;
		color: white;
		font-size: 0.7em;
		font-weight: normal;
	}
    .end {
		position: absolute;
		z-index: 2;
		top: 95%;
		right: 0;
		left: 0;
        text-align: center;
	}
	.volumeMainWindow {
		z-index: 2;
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		margin: auto;
		overflow: scroll;
		color: white;
		height: 76vh;
		width: 70vh;
		min-width: 547px;
		min-height: 610px;
		background: radial-gradient(circle farthest-corner at 700% 100%, #eb2e4a 0%, #000000 100%);
	}
	.voiceroom {
		margin-left: 5vh;
		margin-top: 5vh;
		height: 65vh;
		width: 60vh;
		min-width: 483px;
		background: radial-gradient(farthest-corner at 78% 128%, #eb2e4a -138%, #000000 116%);
	}
	.voicelist {
		width: 57vh;
		min-width: 464px;
		height: 100%;
		overflow: auto;
		visibility: visible;
	}
	.voiceRoomPlayerSettings {
		display: flex;
		height: 3vh;
		width: 48vh;
		min-width: 397px;
		margin-left: 5vh;
		margin-bottom: 1vh;
		border: solid 1px #dcdcdc;
		border-radius: 10px;
		background: none;
	}
	.userloc {
        height: 1.3vh;
	}
	.imgdistance {
		margin-left: 7vh;
		height: 1.1vh;
	}
	.micSettings {
		margin-left: 2vh;
		height: 1.5vh;
	}
	.sliderP {
		-webkit-appearance: none;
		align-items: center;
    	margin: 0;
		-webkit-appearance: none;
		width: 17vh;
		min-width: 157px;
		padding: 0;
		border: 0;
	}
	.sliderP::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 7px;
		height: 7px;
		background: #eb2e4a;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	.sliderP::-webkit-slider-runnable-track {
		display: flex;
    	align-items: center;
    	height: 3px;
		background: linear-gradient(90deg, #eb2e4a var(--columnsP), #4c2027 var(--columnsP));
		cursor: pointer;
		border-radius: 40px;
		border: 0;
		margin-left: 1vh;
	}
    .input-text {
        margin-left: 5vh;
		margin-top: 1vh;
		margin-bottom: 1vh;
		padding: 0 3%;
		border: solid 1px #dcdcdc;
		background: none;
		font-size: 100%;
		border-radius: 10px;
		font: 0.8em TTNorms-Regular;
		color: #949494;
		width: 48vh;
		height: 3vh;
		cursor: pointer;
	}
    [anim="anim"]:before {
		--ripple-background: white;
		--ripple-opacity: 0.3;
		--ripple-duration: 600ms;
		content: '';
		position: absolute;
		display: block;
		background: var(--ripple-background, white);
		border-radius: 50%;
		pointer-events: none;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		width: calc(var(--d) * 1px);
		height: calc(var(--d) * 1px);
		opacity: calc(var(--o, 1) * var(--ripple-opacity, 0.3));
		transition: calc(var(--t, 0) * var(--ripple-duration, 600ms)) var(--ripple-easing, linear);
		transform: translate(-50%, -50%) scale(var(--s, 1));
		transform-origin: center;
	}
	[anim="anim"] {
		position: relative;
		overflow: hidden;
	}
	[anim="anim"]:hover { background-color: darken(#00000000, 10%); color: rgba(white, 1);}
</style>

<div class="volumeMainWindow" id="volumeMainWindow" transition:fade>
    <div id="voiceroom" class="voiceroom">
        <div id="voiceRoom1list" class="voicelist">
            <table id="voiceRoomPlayerSettings1">
                <input type="text" class="input-text" placeholder="Введите никнейм">
                <tbody>
                    {#each array as player,id}
                        <tr class="voiceRoomPlayerSettings">
                            <th>
                                <img src="img/userloc.png" class="userloc" alt="userloc">
                                <p>{player.name}</p>
                            </th>
                            <th>
                                <img src="img/distance.png" class="imgdistance" alt="distance">
                                <p id="userName{id}Distance">
                                    {player.distance != undefined ? player.distance + ' m.':'много m.'}
                                </p>
                            </th>
                            <th>
                                <img src="img/micSettings.png" class="micSettings" alt="micSettings">
                                <input
                                    id="sliderP{id}" min="0" max="100" type="range" class="sliderP"
                                    bind:value={list[player.id].value}
                                    style="--columnsP:{list[player.id].value + "%"}"
                                    on:input = {() => {
                                        if(inGame) window.SetPlayerVolume(player.id, list[player.id].value);
                                    }}>
                                <p id="sliderP{id}volume">{list[player.id].value}</p>
                            </th>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
    <div class="end">
        <button anim="anim"
            on:click={(event) => {
            click(event,'volumeMainWindow');
            }}
        >Закрыть</button>
    </div>
</div>
