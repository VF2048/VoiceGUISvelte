<script>
    export let players;
    export let rooms;
    export let selected;
    export let mainWindowOpen;
    export let mutes;
    export let mute;

    let overlay;
    const move = {
		nowMove:'',
		ismove: false,
		domove:false,
		background: '',
		anim_value:5,
		anim:0,
		elem: {
			shiftX:0,
			shiftY:0,
		},
		overlay: {
			move:false,
			left: 330,
			top: 18,
		},
		overlayVolumeOn: {
			left: 25,
			top: 19,
		},
		overlayMicrophone: {
			left: 78,
			top: 20,
		},
	};

	var animation_f;
	function tick_animation() {
		if(!move.anim_value && move.anim <= 0.5)
			move.anim += 0.005;
		if(move.anim_value) 
			move.anim -= 0.005;
		move.background = "rgba(255, 255, 255, " + move.anim + ")";
		if (move.anim < 0)
			clearInterval(animation_f);
	};
    
	function onMouseUp() {
		if(!move.domove){
			if(move.nowMove === 'overlayVolumeOn') {
				mute(1);
            };
            if(move.nowMove === 'overlayMicrophone') {
				mute(2);
            }
        }
        move.nowMove = false;
		move.ismove = false;
		move.domove = false;
		move.overlay.move = false;
		move.anim_value = 1;
    };
    
    function onMouseDown(event,id) {
        if(event.which !== 1)
            return;
        move.nowMove = id;
        move.ismove = true;
        if(id == "overlay"){
			move.overlay.move = true;
            move.elem.shiftX = event.clientX - overlay.getBoundingClientRect().left;
            move.elem.shiftY = event.clientY - overlay.getBoundingClientRect().top;
			animation_f = setInterval(tick_animation, 10);
			move.anim_value = 0;
        }else {
            move.elem.shiftX = event.clientX - event.target.getBoundingClientRect().left;
            move.elem.shiftY = event.clientY - event.target.getBoundingClientRect().top;
        }
    };
    
    function onMouseMove(event) {
		if(move.ismove && mainWindowOpen){
			switch(move.nowMove){
				case 'overlay' :{

					move.overlay.left = event.pageX - move.elem.shiftX;
					move.overlay.top = event.pageY - move.elem.shiftY;
					break;
				};
				case 'overlayVolumeOn' :{
					move.overlayVolumeOn.left = event.pageX - move.elem.shiftX;
					move.overlayVolumeOn.top = event.pageY - move.elem.shiftY;
					move.domove = true;
					break;
				};
				case 'overlayMicrophone' :{
					move.overlayMicrophone.left = event.pageX - move.elem.shiftX;
					move.overlayMicrophone.top = event.pageY - move.elem.shiftY;
					move.domove = true;
					break;
				};
			}
		}
	};

	function animation(){
		if(move.overlay.move && i<0.457){
			i += 0.005
			move.background = "rgba(255, 255, 255, " + i + ")";
		}
		else if(!move.overlay.move && i>0){
			i -= 0.005
			move.background = "rgba(255, 255, 255, " + i + ")";
		};
	};

	// setInterval(animation,16);

</script>

<style>
    p {
		margin: 0;
		margin-left: 1%;
    	font-family: TTNorms-Regular;
		color: #bcbcbc;
		letter-spacing: 0.02em;
		font-size: 1.1em;
		white-space: nowrap;	
	}
	.overlay {
		position: absolute;
		min-width: 137px;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
		z-index: 1000;
	}
	.overlayRadiomin {
		height: 2.3vh;
		margin-top: 0.3vh;
		margin-left: 1vh;
	}
	.overlayRoomName {
		font-family: TTNormal-Light;
		font-size: 1.6em;
		margin-left: 1vh;
		color: #ffffff;
		width: 0px;
	}
	.overlayRadiominImg {
		height: 1.3vh;
	}
	.overlayPlayer {
		font-family: TTNorms-Regular;
		color: #ffffff;
		font-size: 0.8em;
		width: 26px;
	}
	.overlayPlayerDistance {
		font-family: TTNorms-Regular;
		color: #ffffff;
		font-size: 0.8em;
	}
	.overlayMicrophone {
		height: 5vh;
		position: absolute;
		z-index: 1000;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
	}
	.overlayVolumeOn {
		height: 5vh;
		position: absolute;
		z-index: 1000;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
	}
    .micOverPlayer {
		z-index: -1;
		position: absolute;
		top: var(--x);
		left: var(--y);
		height: var(--size);
	}
</style>

<svelte:window 
    on:mouseup="{onMouseUp}"
	on:mousemove="{(event) => onMouseMove(event)}"
/>

<div
    on:mousedown="{(event) => onMouseDown(event,'overlay')}"
    bind:this={overlay}
    id="overlay"
    class="overlay over"
    style="--left:{move.overlay.left+'px'};--top:{move.overlay.top+'px'};background-color:{move.background}">
    {#each rooms as room,rid}
        {#if !room.is_radio || room.rid == selected}
            <table class="over">
                <thead class="over">
                    <tr>
                        <th class="over"><img draggable="false" class="overlayRadiomin over" src="img/radiomin.png" alt="overlayRadiomin"></th>
                        <th class="over"><p class="overlayRoomName over" id="overlayRoomName">{room.rname}</p></th>
                    </tr>
                </thead>
                <tbody>
                    {#each players as player,id}
                        {#if (!room.is_radio && player.isteam == 1) || (room.is_radio && player.isteam == 2)}
                            <tr>
                                <th class="over"><img draggable="false" class="overlayRadiominImg over" src="img/overlayVolume.png" alt="overlayRadiomin"></th>
                                <th class="over"><p class="overlayPlayer over" id="overlayPlayer">{player.name}</p></th>
                                <th class="over"><p class="overlayPlayerDistance over" id="overlayPlayerDistance">
                                                    {#if player.text != undefined}
                                                        {player.text}
                                                    {:else}
                                                        {player.distance+'m.'}
                                                    {/if}
                                                </p>
                                </th>
                            </tr>
                        {/if}
                    {/each}
                </tbody>
            </table>
        {/if}
    {/each}
	</div>
	{#if !mutes.main.soundMute}
		<img
            on:mousedown="{(event) => onMouseDown(event,'overlayVolumeOn')}"
            draggable="false"
			class="overlayVolumeOn"
			id="overlayVolumeOn"
			src="img/overlayVolumeOn.png"
			alt="overlayVolumeOn"
			style="--left:{move.overlayVolumeOn.left+'px'};--top:{move.overlayVolumeOn.top+'px'}"
		>
	{:else}
		<img
            on:mousedown="{(event) => onMouseDown(event,'overlayVolumeOn')}"
            draggable="false"
			class="overlayVolumeOn"
			id="overlayVolumeOn"
			src="img/overlayVolumeOff.png"
			alt="overlayVolumeOn"
			style="--left:{move.overlayVolumeOn.left+'px'};--top:{move.overlayVolumeOn.top+'px'}"
		>
	{/if}
	{#if !mutes.main.microphoneMute}
		<img 
            on:mousedown="{(event) => onMouseDown(event,'overlayMicrophone')}"
            draggable="false"
			class="overlayMicrophone"
			id="overlayMicrophone"
			src="img/overlayMicrophone.png"
			alt="overlayMicrophone"
			style="--left:{move.overlayMicrophone.left+'px'};--top:{move.overlayMicrophone.top+'px'}"
		>
	{:else}
		<img 
            on:mousedown="{(event) => onMouseDown(event,'overlayMicrophone')}"
            draggable="false"
			class="overlayMicrophone"
			id="overlayMicrophone"
			src="img/overlayMicrophoneOff.png"
			alt="overlayMicrophone"
			style="--left:{move.overlayMicrophone.left+'px'};--top:{move.overlayMicrophone.top+'px'}"
		>
	{/if}
	{#each players as player}
		{#if !player.is_muted && player.isteam == 1}
			<img class="micOverPlayer" style="--x:{player.left + "px"};--y:{player.top + "px"};--size:{player.distance + "px"};" src="img/micSettings.png" alt="micOverPlayer">
		{/if}
		{#if !player.is_muted && player.isteam == 2}
			<img class="micOverPlayer" style="--x:{player.left + "px"};--y:{player.top + "px"};--size:{player.distance + "px"};" src="img/micSettings.png" alt="micOverPlayer">
		{/if}
		{#if !player.is_muted && player.isteam == 3}
			<img class="micOverPlayer" style="--x:{player.left + "px"};--y:{player.top + "px"};--size:{player.distance + "px"};" src="img/micSettings.png" alt="micOverPlayer">
		{/if}
	{/each}