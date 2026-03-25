/*
 * Simple wrapper around sound manager 2 to make audio playback easier than it already is.
 *
 */
 var audioReady = false;
 var maxDriverSounds = 0;
 
 // TODO: Perhaps we should make the query API take in a "DB" url so that we can load the drivers configured
 // sound.  For now this will do.
 var audioResources = {
						'heatover': {url:'../audio/woman/heatover_w.mp3', driverSound:false, resource:[]},
						'raceover': {url:'../audio/woman/raceover_w.mp3', driverSound:false, resource:[]},
						'yellowflag': {url:'../audio/woman/yellowflag_w.mp3', driverSound:false, resource:[]},
						'start5': {url:'audio/woman/woman_5.mp3', driverSound:false, resource:[]},
						'start4': {url:'audio/woman/woman_4.mp3', driverSound:false, resource:[]},
						'start3': {url:'audio/woman/woman_3.mp3', driverSound:false, resource:[]},
						'start2': {url:'audio/woman/woman_2.mp3', driverSound:false, resource:[]},
						'start1': {url:'audio/woman/woman_1.mp3', driverSound:false, resource:[]},
						'start0': {url:'audio/woman/woman_0.mp3', driverSound:false, resource:[]},
						'lap':{url:'../audio/beep.mp3', driverSound:true, curIndex:0, resource:[]},
//						'lap':{url:'../audio/beep.wav', driverSound:true, curIndex:0, resource:[]},
						'bestlap': {url:'../audio/driveby.mp3', driverSound:true, curIndex:0, resource:[]},
						'outoffuel': {url:'../audio/woman/w_fuel_0.mp3', driverSound:true, curIndex:0, resource:[]},
						'lowfuel': {url:'../audio/woman/w_fuel_1.mp3', driverSound:true, curIndex:0, resource:[]},
						'fullfuel': {url:'../audio/woman/w_fuel_2.mp3', driverSound:true, curIndex:0, resource:[]}
					  };
					  
function loadResources(numDriverSounds, volume) {
	// DPA: Not sure if this craziness is needed loading the sound more than once so that we can play it 
	// multiple times, but before I put this in, the sounds would restart rather than play a second time...
	// Oddly when you look at the logs there's a weird line in there that indicates the extra files didn't
	// load...  but it sounds right so all good I suppose.
	for (var resource in audioResources ) {
		if (audioResources[resource].driverSound) {
			for (var k = maxDriverSounds; k < numDriverSounds; k++) {
				var id = resource + k;
				audioResources[resource].resource[k] = soundManager.createSound({
					id: id,
					url: audioResources[resource].url,
					multiShotEvents:true,
					volume: volume,
					autoLoad: true,
				});
			}
		} else if (maxDriverSounds == 0) {
			audioResources[resource].resource[0] = soundManager.createSound({
				id: resource,
				url: audioResources[resource].url,
				multiShotEvents:true,
				volume: volume,
				autoLoad: true,				
			});
		}
	}

/*
	for (var resource in audioResources ) {
		if (audioResources[resource].driverSound) {
			for (var k = maxDriverSounds; k < numDriverSounds; k++) {
				audioResources[resource].resource[k] = new Audio(audioResources[resource].url);
			}
		} else if (maxDriverSounds == 0) {
			audioResources[resource].resource[0] = new Audio(audioResources[resource].url);
		}
	}
*/	
	maxDriverSounds = numDriverSounds;
}

function initAudio(numDriverSounds, rcVolume) {
	if (numDriverSounds > maxDriverSounds && rcVolume > 0) {
		if (!audioReady) {
			soundManager.setup({
			  url: 'scripts/soundmanager2/swf',
			  // optional: use 100% HTML5 mode where available
			  preferFlash: true,
			  onready: function() {  
				audioReady = true;
				loadResources(numDriverSounds, rcVolume);
			  },
			});    
		} else {
			// make sure we have enough driver sounds...
			loadResources(numDriverSounds, rcVolume);
		}
	}
/*
	if (numDriverSounds > maxDriverSounds && rcVolume > 0) {
		loadResources(numDriverSounds, rcVolume);
	}	
*/	
}

function playAudio(audioId) {
	if (audioReady) {
		if (audioResources[audioId].driverSound) {
			// Rotate throuh the loaded driver sounds
			var id = audioId + audioResources[audioId].curIndex;
			soundManager.load(id);
			soundManager.play(id);
			audioResources[audioId].curIndex++;
			audioResources[audioId].curIndex %= maxDriverSounds;
		} else {
			soundManager.load(audioId);
			soundManager.play(audioId);
		}		
	}
/*
	if (audioResources[audioId].driverSound) {
		// Rotate throuh the loaded driver sounds
		audioResources[audioId].resource[audioResources[audioId].curIndex].play();
		audioResources[audioId].curIndex++;
		audioResources[audioId].curIndex %= maxDriverSounds;
	} else {
		audioResources[audioId].resource[0].pause();
		audioResources[audioId].resource[0].currentTime = 0;
		audioResources[audioId].resource[0].play();
	}				
*/	
}
  