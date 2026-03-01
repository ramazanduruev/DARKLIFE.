
require("virus");
require("collector");
require("crystalVirusSystem");
require("tc");
require("globalChat");




//коррозия труб
Events.on(ContentInitEvent, () => {
    const myDuct = Vars.content.getByName(ContentType.block, "mo-01g-01-obsidianPipe");

    if(myDuct != null){
        myDuct.buildType = () => extend(Duct.DuctBuild, myDuct, {
            updateTile(){
                this.super$updateTile();
                if(this.items.total() > 0){
                    if(Mathf.chance(0.001)){
                        this.damage(1);
                        Fx.heatReactorSmoke.at(this.x, this.y);
                    }
                }
            }
        });
    } else {
        Log.err("Блок не найден! Проверь имя: mo-01g-01-obsidianPipe");
    }
});






//фонарь
const scoutSearchlightUnit = extend(UnitType, "01d-01-memory", {
    draw(unit) {
        this.super$draw(unit);

        
        if (Vars.state.rules.lighting && Core.settings.getBool("sf-flashlight-toggle", true)) {
            let lightColor = Color.valueOf("ffffa0");
            let opacity = 0.45;

            let scanSpeed = 0.01;
            let scanAngle = 8;
            let lightLength = 120;
            let coneWidth = 40;

            let currentAngle = unit.rotation + Math.sin(Time.time * scanSpeed) * scanAngle;

            let startX = unit.x + Angles.trnsx(unit.rotation, 6);
            let startY = unit.y + Angles.trnsy(unit.rotation, 6);

            let targetX = startX + Angles.trnsx(currentAngle, lightLength);
            let targetY = startY + Angles.trnsy(currentAngle, lightLength);

            Drawf.light(startX, startY, targetX, targetY, coneWidth, lightColor, opacity);
        }
    }
});
Events.on(ClientLoadEvent, () => {
    Vars.ui.settings.game.checkPref(
        "Turn on the core unit's flashlight", 
        true, 
        b => Core.settings.put("sf-flashlight-toggle", b)
    );
});




//время
Events.on(ClientLoadEvent, () => {
    const timePanel = new Table();
    timePanel.background(Styles.black6);
    timePanel.margin(8);

    let multiplier = 1.0;

    const speedLabel = new Label("GameSpeed: 1.0x");
    speedLabel.update(() => {
        speedLabel.setText("GameSpeed: " + multiplier.toFixed(1) + "x");
    });

    timePanel.add(speedLabel).colspan(3).padBottom(6);
    timePanel.row();

    function createSpeedButton(text, value) {
        timePanel.button(text, () => {
            multiplier = value;
        }).size(55, 38).pad(2);
    }

    createSpeedButton("1x", 1.0);
    createSpeedButton("2x", 2.0);
    createSpeedButton("3x", 3.0);

    timePanel.update(() => {
        if (Vars.state && Vars.state.isGame() && !Vars.state.isPaused()) {
            if (multiplier > 1.0) {
                let extraTicks = Math.floor(multiplier) - 1;
                for (let i = 0; i < extraTicks; i++) {
                    Vars.logic.update();
                }
            }
        }
    });

    Vars.ui.hudGroup.addChild(timePanel);
    timePanel.bottom().center();
    timePanel.translation.set(160, 150);
});





