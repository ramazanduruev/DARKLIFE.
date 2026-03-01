Events.on(ClientLoadEvent, () => {
    let myBlock = Vars.content.getByName(ContentType.block, "mo-02i-07-collector");
    
    if (myBlock != null) {
        myBlock.buildType = () => {
            return extend(GenericCrafter.GenericCrafterBuild, myBlock, {
                shouldConsume() {
                    let myWeather = Vars.content.getByName(ContentType.weather, "mo-freezingrain");
                    if (myWeather == null) return false;

                    let isCustomWeatherActive = false;
                    
                    Groups.weather.each(w => {
                        if (w.weather === myWeather) {
                            isCustomWeatherActive = true;
                        }
                    });

                    if (!isCustomWeatherActive) return false;
                    
                    return this.super$shouldConsume();
                }
            });
        };
    }
});

