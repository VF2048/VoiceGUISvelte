<script>
    import { fade } from 'svelte/transition';
    export let recitation;
    export let windowName;
    export let selected;
    export let array;
    export let click;
    export let logo;
    export let selection;
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function animation(event){
        let x = event.clientX - event.target.getBoundingClientRect().x;
        let y = event.clientY - event.target.getBoundingClientRect().y;
        for(let i=0;i<=100;i+=5){
            event.target.style.cssText = "--x:" + x + "; --y:" + y +"; --size:" + i + ";";
            await sleep(16);
        }
	};

</script>


<style>
    :root {
        --background: #ff2a4a;
        --ripple-background: white;
        --ripple-opacity: 0.3;
		--ripple-duration: 600ms;
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
    #floatwindow {
		z-index: 2;
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}
    .mutlist {
		width: 32vh;
		height: 33vh;
		min-height: 268px;
		min-width: 281px;
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		margin: auto;
		background-color: #1b1a1a;
		background: linear-gradient(145deg, #000000 0%, #63232e 280%);
		box-shadow: 0px 0px 100px 0px rgba(0,0,0,0.75);
	}
    .leaf {
		margin-left: 10%;
		margin-top: 10%;
	}
    .deviceListPlayers {
		height: 54%;
		width: 85%;
		overflow: auto;
		margin-left: 3vh;
		margin-top: 2vh;
	}
    ul {
		list-style: none;
		height: 100%;
		width: 100%;
		margin: 0;
		padding: 0;
	}
    .inputDevice:checked + label div {
		padding: 2% 7%;
		margin-bottom: 4%;
		height: 14px;
		width: 193px;
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #FFFFFF;
		background: radial-gradient(circle farthest-corner at calc(var(--x,1) * 1px) calc(var(--y,1) * 1px), #eb2e4a  calc(var(--size,100)*1%), #0000 0%);
		border: solid 1px #eb2e4a;
		white-space: nowrap;
        transition: calc(var(--t, 0) * var(--ripple-duration, 600ms)) var(--ripple-easing, linear);
		transform-origin: center;
	}
    .selectorDevice {
        text-decoration: none;
		padding: 2% 7%;
		margin-bottom: 4%;
		height: 14px;
		width: 193px;
		text-align: left;
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #949494;
		background: none;
		border: solid 1px #dcdcdc;
		white-space: nowrap;
        cursor: pointer;
	}
    input[type=radio] {
		display: none;
	}
    .end {
		text-align: center;
		margin: 2vh;
	}
    [anim="anim"]:before {
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
        
<div id="floatwindow" transition:fade>
    <div class="mutlist">
        <p class="leaf">{logo}</p>
        <div id="mutListPlayers" class="deviceListPlayers">
            <ul id="deviceSelectList">
                {#if recitation}
                    {#each array as elem,id}
                        <li>
                            <input
                                type="radio" value={id} id="radioDevice{id}" name="radioDevice" class="inputDevice"
                                bind:group={selected}>
                            <label for="radioDevice{id}">
                                <div anim="select"
                                    class="selectorDevice"
                                    on:click={(event) => {
                                        if(elem.id != undefined)
                                            selection(elem.id);
                                        else 
                                            selection(id);
                                        animation(event);
                                    }}
                                >
                                    {#if elem.name}
                                        {elem.name}
                                    {:else}
                                        {elem}
                                    {/if}
                                </div>
                            </label>
                        </li>
                    {/each}
                {/if}
            </ul>
        </div>
        <div class="end">
            <button anim="anim"
                on:click={(event) => {
                click(event,windowName);
                }}
            >Закрыть</button>
        </div>
    </div>
</div>