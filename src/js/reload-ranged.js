var Reload = Reload || (function() {
    'use strict';
    const RELOADS_ATTR = "equipped_ranged_reloads",
    AMMO_ATTR = "equipped_ranged_ammo",

    HandleInput = function(msg) {
        if (msg.type !== "api") {
			return;
        }
        
        if (!msg.content.startsWith("!!reload")){
            return;
        }

        let sender=(getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname'),
            token,
            character;
        
        //Get character from sending player's selected token
        if ("selected" in msg){
            token = getObj('graphic', msg.selected[0]._id);

            if (token){
                character = getObj('character', token.get('represents'));
            }
        }

        //Validate player
        if (character){
            if( ! validatePlayerControl(character, msg.playerid)) {
                sendMessage('You do not control the selected character', sender, true, "danger");
                return;
            }

        } else{
            sendMessage("You must select a token with a valid character sheet!", sender, true, "danger");
            return;
        }

        //Handle Reload
        let reloads = attrLookup(character, RELOADS_ATTR),
        ammo = attrLookup(character, AMMO_ATTR);

        if (!reloads || !ammo){
            sendMessage("Could not find attribute. Please verify this character has an initialized character sheet.", sender, true, "danger");
            return;
        }

        
        if ((!reloads.get("current") && reloads.get("current") !== 0)|| !ammo.get("max")){
            sendMessage("Your character either has no ranged weapon equipped or the reloads / max Ammo field(s) is empty!", sender, true, "danger");
            return;
        }

        let currReloads = parseInt(reloads.get("current"), 10) || 0,
            ammoMax = parseInt(ammo.get("max"), 10) || 0;


        if (currReloads <= 0){
            sendMessage(character.get('name') + " has no more reloads left.", sender, false, "danger");
            return;
        } else if (currReloads === 1){
            sendMessage(character.get('name') + " has only one more reload. Make it count.", sender, false, "warning");
        }

        sendMessage(character.get('name') + " reloads their ranged weapon!", sender, false);
        ammo.setWithWorker({current: ammoMax});
        reloads.setWithWorker({current: (currReloads - 1)});

    },
    attrLookup = function(character, name){
        return findObjs({type: 'attribute', characterid: character.id, name: name})[0];
    },
    validatePlayerControl = function(character, playerId){
        return playerIsGM(playerId) ||  
        _.contains(character.get('controlledby').split(','),playerId) || 
        _.contains(character.get('controlledby').split(','),'all');
    },
    sendMessage = function(message, who, whisper, type="info" ) {
        let textColor = '#006400',
            bgColor = '#98FB98';

        
        switch (type) {
            case "danger":
                textColor = '#8B0000';
                bgColor = '#FFA07A';
                break;
            case "warning":
                textColor = '#8B4513';
                bgColor = '#F0E68C';
                break;
        }


		sendChat(
            'ZnZ Action - Reload',
            `${(whisper||'gm'===who)?`/w ${who} `:''}<div style="padding:1px 3px;border: 1px solid ${textColor};background: ${bgColor}; color: ${textColor}; font-size: 80%;">${message}</div>`
		);
	},
    RegisterEventHandlers = function() {
		on('chat:message', HandleInput);
	};

	return {
		RegisterEventHandlers: RegisterEventHandlers
	};
}());


on("ready",function(){
	'use strict';
	Reload.RegisterEventHandlers();
});