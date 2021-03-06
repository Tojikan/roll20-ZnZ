/**
 * Handles rolls for damage
 */
var DamageRoll = DamageRoll || (function() {
    'use strict';

    const RANGED_DAMAGE_ATTR = "(([[getProperty('prefixes.ranged')]]))_(([[searchProperty('canonical', 'rangedDamage', 'items').attr_name]]))";
    const MELEE_DAMAGE_ATTR = "(([[getProperty('prefixes.melee')]]))_(([[searchProperty('canonical', 'meleeDamage', 'items').attr_name]]))";
    
    // Aren't character attributes but will be used to denote special damage characteristics.
    const UNARMED_DAMAGE = "unarmed_damage";

    const HandleInput = function(msg) {
        if (msg.type !== "api") {
			return;
        }

        if (!msg.content.startsWith("!!damage")){
            return;
        }

        let sender = (getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname'),
            args = splitArgs(msg.content),
            character = getCharacter(sender, msg, args);

        // Help flag.
        if (("help" in args) || Object.keys(args).length == 1 || ("1" in args && args["1"] == "help")){
            let attributeArray = (([[transformData('attributes', (data) => {
                return data.map((x)=>{return x.attr_name});
            })]]));
            
            let message = '***D-Roll Help *** <br/> This script rolls weapon damage for you. Requires an equipped melee/ranged weapon. <br/><br/>' + 
            '**How to Roll** <br/> Specify a number of dice to roll. <br/><br/> *<div>!!damage 3 - roll damage 3 times.</div> <div>!!damage 5 - roll damage 5 times</div>*<br />' +
            'Then specify whether its a melee, ranged, or unarmed attack by adding flags. <br /><br /> *<div>!!damage 3 --melee</div><div>!!damage 3 --unarmed</div><div>!!damage 3 --ranged</div>*<div>You can also use --m, --r, --u as a shorthand</div><br/><br/>' +
            '**Additional Flags**<br/> Adding the following flags to the roll command to add an effect. <br/><br/>' +
            'Attribute Adding - Adds attribute modifier and bonus once to the sum of the roll. Requires a character to be selected. <br/><br/>';
            for (let attr of attributeArray){
                message += `    *--${attr}* <br/>`;
            }
            message += '<br/>Powered Strike: Adds attribute modifier and bonus to each damage rolled. Requires a character to be selected. <br/><br/>';
            for (let attr of attributeArray){
                message += `    *power=${attr}* <br/>`;
            }
            sendMessage(message, sender, true);
            return;
        }
            
            
        /////////// Validations
        
        if (character == null){
            sendMessage(`You must select a token in order to roll damage!`, sender, true, "danger");
            return;
        }

        var type = "";

        if ("melee" in args || "m" in args){
            type = MELEE_DAMAGE_ATTR;
        } else if ("ranged" in args || "r" in args){
            type = RANGED_DAMAGE_ATTR;
        } else if ("unarmed" in args || "u" in args){
            type = UNARMED_DAMAGE;
        }
        
        //Check we have number of dice to roll.
        if (!("1" in args)){
            sendMessage('You must specify a number of times to roll damage (example: !!damage 5)', sender, true, 'danger');
            return;
        } 

        if (!type.length){
            sendMessage(`You must specify either melee or ranged damage or unarmed with '--melee' or '--ranged' or '--unarmed' flags! (or --m, --r, --u)`, sender, true, "danger");
            return;
        }

        //Validate number of dice.
        let diceRoll = parseInt(args[1], 10);
        if (isNaN(diceRoll)){
            sendMessage('Error! You have specified a non-number for number of times to roll damage.', sender, true, 'danger');
            return;
        } else if (diceRoll < 0){
            sendMessage('Error! You have specified a negative number of times to roll damage.', sender, true, 'danger');
            return;
        }

        DamageHandler(type, diceRoll, args, character, sender).handleDamage();

    },
    /**
     * Closure to handle processing damage.
     * - Type is the damage type character attr, determined at validation. 
     */
    DamageHandler = function(type, dice, args, char, sender){
        // Roll Scoped variables - accessible by all functions in the handler.
        // Uses _CamelCase to differentiate and prevent accidental changes.
        var _Type = type,
            _TypeText = '',
            _Args = args,
            _Char = char,
            _Sender = sender,
            _WeaponDamage = setDamage(),
            _DamageParsed = {min: 0, max: 0},
            _NumOfAttacks = dice,
            _DmgMessage = `${_Char.get('name')} rolls damage ${_NumOfAttacks} times${_TypeText}!<br/><br/>`,
            _DmgArray = [],
            _Bonus = 0,
            _HasError = false;

        const _Attributes = (([[transformData('attributes', (data) => {
            return data.map((x)=>{return x.attr_name});
        })]]));
        
        try {
            _DamageParsed = parseDamageExpr(_WeaponDamage);
        } catch (e){
            sendMessage(`Error occured while parsing weapon damage! - ${e}`, sender, true, "danger");
            _HasError = true;
        }

        /***
         * Get weapon damage.
         */
        function setDamage(){

            switch (_Type){
                case RANGED_DAMAGE_ATTR:
                    _TypeText = ' using their Ranged Weapon damage!';
                    return getAttrByName(_Char.id, _Type);
                case MELEE_DAMAGE_ATTR:
                    _TypeText = ' using their Melee Weapon damage!';
                    return getAttrByName(_Char.id, _Type);
                case UNARMED_DAMAGE:
                    _TypeText = ' using Unarmed damage!';
                    return '1'; //needs to be string for parsing later
            };

            sendMessage(`Unknown type error`, _Sender, true, "danger");
            _HasError = true;
        }

        /**
         * Returns an array of numbers to represent a damage roll.
         */
        function rollDamage(){
            let min = _DamageParsed.min,
                max = _DamageParsed.max;

            if (max < min){ 
                sendMessage(`The Damage Expression '${_WeaponDamage}' has a max damage lower than min damage! Min damage cannot be higher than max damage!`, _Sender, true, "danger");
                _HasError = true;
            }

            let diff = max - min,
                result = [];

            if (diff > 0){
                for (let i = 0; i < _NumOfAttacks; i++){
                    // +/- 1 so we can pseudo-roll 0.
                    let random = randomInteger(diff + 1); 
                    result.push(min + (random - 1));
                }
            } else {
                for (let i = 0; i < _NumOfAttacks; i++){
                    result.push(min);
                }
            }

            _DmgArray = result;

        }
        
        /**
         * Formats damage array into a chat message for display.
         */
        function displayDamage(){
            var rollText = '<div style="line-height: 1.6; background: white; padding: 2px;">',
            finalStyle = 'font-weight: 900; font-size: 16px; padding: 3px; border:solid 1px black; background: yellow',
            rollStyle = 'font-size: 12px; border: solid 1px gray; padding:1px 2px;',
            result = (_DmgArray.reduce((a,b) => a + b, 0)) + _Bonus;
            
            log("DmgArray: " + _DmgArray.toString());
            for (let i = 0; i < _DmgArray.length; i++){
                let text = ''
                
                if (i != 0){
                    text += ' + ';
                }

                text += `<span style='${rollStyle}'>${_DmgArray[i]}</span>`;

                // log(i + ":" + text);
                rollText += text;
            }

            if (_Bonus != 0){
                rollText += ` + (${_Bonus})`
            }


            rollText += ` = <span style='${finalStyle}'>${result}</span></div>`

            return rollText;
        }

        /**
         * Handler for adding attribute bonus
         */
        function handleAttribute(){
    
            for (let attr of _Attributes){
                if (("bonus" in _Args && _Args['bonus'] == attr) || (attr in _Args && _Args[attr] == true)){
                    let attrMod = parseInt(getAttrByName(_Char.id, attr + "_mod"), 10) || 0,
                        attrBonus = parseInt(getAttrByName(_Char.id, attr + "_bonus"), 10) || 0;
                        
                    _Bonus = attrMod + attrBonus;
                    _DmgMessage += `<div>${_Char.get('name')} adds their ${capitalizeWord(attr)} (${attrMod + attrBonus}) to the final damage amount!</div><br/>`;
                }
            }
        }

        /**
         * Handler for adding attribute bonus to each damage roll.
         */
        function handlePoweredStrike(){
            for (let attr of _Attributes){
                if (("power" in _Args && _Args['power'] == attr)){
                    let attrMod = parseInt(getAttrByName(_Char.id, attr + "_mod"), 10) || 0,
                        attrBonus = parseInt(getAttrByName(_Char.id, attr + "_bonus"), 10) || 0,
                        power = attrMod + attrBonus;

                    _DmgArray = _DmgArray.map((x)=>{
                        return x += power;
                    });

                    log (_DmgArray);

                    _DmgMessage += `<div>${_Char.get('name')} uses a ${capitalizeWord(attr)}-powered strike and adds (${power}) to each damage roll!</div><br/>`;
                }
            }
        }

        function handleDamage(){
            rollDamage();
            handleAttribute();
            handlePoweredStrike();
            if (!_HasError){
                sendMessage(`<span style="font-weight: 900; font-size: 14px;">${_DmgMessage}</span> <br/> ${displayDamage()}`, _Sender, false);
            }
        }

        return {
            handleDamage: handleDamage
        }
    },
    /**
     * Parse a Damage Expression into an Min-Max object that can be programmatically handled.
     */
    parseDamageExpr = function(dmgExpr){
        const expr = dmgExpr.trim().replace(/\s/g,''), //get rid of all whitespace for easier processing
            dmgRegex = /(^[0-9]+)\-([0-9]+)/;
        
        var result = {
            min: 0,
            max: 0
        };

        //If basic integer
        if (Number.isInteger(filterInt(dmgExpr,10))){
            result.min = result.max = filterInt(dmgExpr,10);
            return result;
        }

        if (!dmgRegex.test(dmgExpr)){
            throw(`The Damage Expression '${dmgExpr}' is not a valid format! Format must either be an integer or a hypen-separated number range(1-5)`);
        }

        //1 - matching group 1 - min
        //2 - matching group 2 - max
        let match = dmgRegex.exec(expr);

        result.min = Number(match[1]);
        result.max = Number(match[2]);

        return result;
    },
    splitArgs = (([[getFunction('splitArgs')]])),
    getCharacter = (([[getFunction('getCharacter')]])),
    capitalizeWord = (([[getFunction('capitalizeWord')]])),
    attrLookup = (([[getFunction('attrLookup')]])),
    getAttrModAndBonus = (([[getFunction('getAttrModAndBonus')]])),
    filterInt = (([[getFunction('filterInt')]])),
    sendMessage = function(message, who, whisper, type="info" ) {
        var textColor = "#000000",
            bgColor = "#ffdfbf";
        
        switch (type) {
            case "danger":
                textColor = '#791006';
                bgColor = '#FFCCCB';
                break;
            case "warning":
                textColor = '#cd5b04';
                bgColor = '#FFFFBF';
                break;
        }

		sendChat(
            `${who}`,
            //broken on prod
            //`${(whisper||'gm'===who)?`/w ${who} `:''}<div style="padding:6px;border: 1px solid ${textColor};background: ${bgColor}; color: ${textColor}; font-size: 14px;"><div style="font-size:20px; margin-bottom: 10px;"><strong>Damage Roll</strong></div>${message}</div>`
            `<div style="padding:6px;border: 1px solid ${textColor};background: ${bgColor}; color: ${textColor}; font-size: 14px;"><div style="font-size:20px; margin-bottom: 10px;"><strong>Damage Roll</strong></div>${message}</div>`
		);
    },
    RegisterEventHandlers = function(){
		on('chat:message', HandleInput);
    };
    
    return {
		RegisterEventHandlers: RegisterEventHandlers
	};
})();

on("ready",function(){
	'use strict';
	DamageRoll.RegisterEventHandlers();
});
