var infectedMap = new Object();

Events.on(BlockDestroyEvent, event => {
    if (event.tile != null && event.tile.build != null) {
        var deadBuild = event.tile.build;
        var myTeam = deadBuild.team;
        var targetItem = Vars.content.getByName(ContentType.item, "mo-crystalProtection");

        if (targetItem != null && deadBuild.items != null && deadBuild.items.get(targetItem) > 0) {
            var centerX = event.tile.x;
            var centerY = event.tile.y;
            var startRadius = 2;

            for (var x = -startRadius; x <= startRadius; x++) {
                for (var y = -startRadius; y <= startRadius; y++) {
                    if (x === 0 && y === 0) continue;
                    var targetTile = Vars.world.tile(centerX + x, centerY + y);
                    if (targetTile != null && targetTile.build != null && targetTile.build.team === myTeam) {
                        infectBlock(targetTile, myTeam);
                    }
                }
            }
        }
    }
});

function infectBlock(tile, team) {
    if (tile == null || tile.build == null || tile.build.team !== team) return;
    var victim = tile.build;
    var posId = tile.x + "_" + tile.y;

    if (infectedMap[posId] === true) return;
    infectedMap[posId] = true;

    victim.damage(2);
    Fx.bubble.at(victim.x, victim.y);
    Fx.sporeSlowed.at(victim.x, victim.y);

    var damageTimer = Timer.schedule(function() {
        if (Vars.world.tile(tile.x, tile.y).build === victim && victim.health > 0) {
            if (infectedMap[posId] !== true) {
                damageTimer.cancel();
                return;
            }

            victim.damage(2);

            var rx = (Math.random() * 16) - 8;
            var ry = (Math.random() * 16) - 8;
            Fx.smoke.at(victim.x + rx, victim.y + ry);
            Fx.freezing.at(victim.x + rx, victim.y + ry);
            Fx.lancerLaserChargeBegin.at(victim.x + rx, victim.y + ry);
        } else {
            infectedMap[posId] = false;
            damageTimer.cancel();
        }
    }, 1, 1);

    Timer.schedule(function() {
        if (tile.build != null && tile.build.team === team && victim.health > 0) {
            if (infectedMap[posId] !== true) return;

            var radius = 1;
            var centerX = tile.x;
            var centerY = tile.y;

            for (var x = -radius; x <= radius; x++) {
                for (var y = -radius; y <= radius; y++) {
                    if (x === 0 && y === 0) continue;
                    var neighborTile = Vars.world.tile(centerX + x, centerY + y);
                    if (neighborTile != null && neighborTile.build != null && neighborTile.build.team === team) {
                        infectBlock(neighborTile, team);
                    }
                }
            }
        }
    }, 3.5);
}

var sanitizerBlock = null;
Events.on(ContentInitEvent, event => {
    sanitizerBlock = Vars.content.getByName(ContentType.block, "mo-02c-08-regenerator");
});

Timer.schedule(function() {
    if (sanitizerBlock == null) return;

    var teams = Vars.state.teams.getActive();
    for (var i = 0; i < teams.size; i++) {
        var teamData = teams.get(i);
        var buildings = teamData.buildings;
        if (buildings == null) continue;

        var iter = buildings.iterator();
        while (iter.hasNext()) {
            var build = iter.next();
            if (build != null && build.block === sanitizerBlock) {
                
                var radius = 9;
                var centerX = build.tile.x;
                var centerY = build.tile.y;

                for (var sx = -radius; sx <= radius; sx++) {
                    for (var sy = -radius; sy <= radius; sy++) {
                        var targetTile = Vars.world.tile(centerX + sx, centerY + sy);
                        
                        if (targetTile != null && targetTile.build != null) {
                            var victim = targetTile.build;
                            var victimPosId = targetTile.x + "_" + targetTile.y;
                            
                            if (infectedMap[victimPosId] === true) {
                                infectedMap[victimPosId] = false;
                                victim.health = victim.maxHealth;
                            }
                        }
                    }
                }
                
                if (Math.random() < 0.25) {
                    Fx.healWave.at(build.x, build.y, 4 * Vars.tilesize);
                }
            }
        }
    }
}, 5, 5);

