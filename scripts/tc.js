Events.on(ClientLoadEvent, () => {
    
    function isTimeControlActive() {
        let tc = Vars.mods.getMod("time-control");
        let tcJs = Vars.mods.getMod("time-control-js");
        let tcNative = Vars.mods.getMod("time-control-native");
        
        
        return (tc != null && tc.enabled()) || 
               (tcJs != null && tcJs.enabled()) || 
               (tcNative != null && tcNative.enabled());
    }
    const lockDiag = new BaseDialog("⚠️ Total ban");
    
    lockDiag.cont.add("[scarlet]MOD CONFLICT DETECTED!").pad(15).row();
    lockDiag.cont.add("[lightgray]Mod [accent]DarkLife[] blocked entry into the game,").row();
    lockDiag.cont.add("[lightgray]you have been diagnosed [scarlet]Time Control[] (Time control).").padBottom(20).row();
    lockDiag.cont.add("[white]Please disable it for the mod").pad(10).row();

    lockDiag.buttons.button("⚙️ Opne mod list", function() {
        lockDiag.hide();
        Vars.ui.mods.show();
    }).size(280, 60).pad(10);


    
    if (isTimeControlActive()) {
        lockDiag.show();
    }

    Timer.schedule(function() {
        if (isTimeControlActive()) {
            if (!lockDiag.isShown() && !Vars.ui.mods.isShown()) {
                lockDiag.show();
            }
            
            
            if (Vars.state.isPlaying()) {
                Time.speed = 1;
                Events.fire(new StateChangeEvent(GameState.State.menu));
            }
        } else {
            if (lockDiag.isShown()) {
                lockDiag.hide();
            }
        }
    }, 0.3, 0.3);
});

