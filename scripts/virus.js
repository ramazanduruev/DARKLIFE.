const MAX_STAGE = 5;
const SPREAD_TIME = 120; 

const EVOLUTION_TIMES_MINUTES = {
    1: 8,  
    2: 12,  
    3: 12,  
    4: 16,  
    5: 0  
};

const SPAWN_INTERVAL_SECONDS = 60; 
const HIVE_MUTATION_CHANCE = 0.01; 

let stageRegions = [];
let hiveRegions = [];

let virusHiveBlock;

const virusBlock = extend(Block, "virus", {
    init() {
        this.super$init();
        this.localizedName = "Dark Virus";
        this.description = "You never know what this is...";
        this.category = Category.defense; 
        this.size = 1;
        this.health = 80;
        this.solid = true;
        this.update = true;
        this.destructible = true;
        this.drawTeamOverlay = false;

        for (let i = 1; i <= MAX_STAGE; i++) {
            stageRegions[i] = Core.atlas.find(this.name + "-stage" + i);
        }

        this.buildType = prov(() => extend(Building, {
            stage: 1,
            evolutionTimer: 0,
            spreadTimer: 0,
            bonusHealth: 0, 

            maxHealth() {
                return this.super$maxHealth() + this.bonusHealth;
            },

            // 1. ЗАЩИТА ОТ СМЕНЫ КОМАНДЫ (например, при захвате секторов)
            changeTeam(next) {
                // Если блок пытаются передать игроку или заброшенной команде, уничтожаем его
                if (next == Team.sharded || next == Team.crux || next == Team.derelict) {
                    Core.app.post(new java.lang.Runnable({
                        run: () => { this.kill(); }
                    }));
                    return;
                }
                this.super$changeTeam(next);
            },

            updateTile() {
                this.super$updateTile();

                // 2. САМОУНИЧТОЖЕНИЕ ПРИ ПЕРЕХОДЕ В DERELICT (ЗАБРОШЕННАЯ КОМАНДА)
                if (this.team == Team.derelict) {
                    this.kill();
                    return;
                }

                if (this.stage < MAX_STAGE) {
                    this.evolutionTimer += Time.delta;
                    let requiredTicks = EVOLUTION_TIMES_MINUTES[this.stage] * 60 * 60;
                    if (this.evolutionTimer >= requiredTicks) {
                        this.stage++;
                        this.evolutionTimer = 0;
                        this.bonusHealth += 200; 
                        this.health += 120; 
                    }
                }

                this.spreadTimer += Time.delta;
                let currentSpreadDelay = SPREAD_TIME / (this.stage * 0.5 + 0.5);
                if (this.spreadTimer >= currentSpreadDelay) {
                    this.spreadTimer = 0;
                    this.trySpread();
                }
            },

            draw() {
                let region = stageRegions[this.stage];
                if (region != null && region.found()) { 
                    Draw.rect(region, this.x, this.y); 
                } else { 
                    this.super$draw(); 
                }
            },

            trySpread() {
                let tileX = this.tileX(); 
                let tileY = this.tileY();
                let directions = [{x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}];
                let dir = directions[Math.floor(Math.random() * directions.length)];
                let targetTile = Vars.world.tile(tileX + dir.x, tileY + dir.y);

                if (targetTile != null) {
                    let build = targetTile.build; 
                    let currentTeam = this.team;
                    
                    if (build == null && targetTile.block().id == Blocks.air.id) {
                        Core.app.post(new java.lang.Runnable({ 
                            run: () => { 
                                if (virusHiveBlock != null && Mathf.chance(HIVE_MUTATION_CHANCE)) {
                                    let t2 = Vars.world.tile(targetTile.x + 1, targetTile.y);
                                    let t3 = Vars.world.tile(targetTile.x, targetTile.y + 1);
                                    let t4 = Vars.world.tile(targetTile.x + 1, targetTile.y + 1);
                                    
                                    if (t2 != null && t3 != null && t4 != null && 
                                        t2.block().id == Blocks.air.id && 
                                        t3.block().id == Blocks.air.id && 
                                        t4.block().id == Blocks.air.id) {
                                        
                                        targetTile.setNet(virusHiveBlock, currentTeam, 0);
                                        return;
                                    }
                                }
                                targetTile.setNet(virusBlock, currentTeam, 0); 
                            } 
                        }));
                    } 
                    else if (build != null && build.block != virusBlock && build.block != virusHiveBlock && build.team != currentTeam) {
                        build.damage(this.stage * 40); 
                        if (build.health <= 0) {
                            Core.app.post(new java.lang.Runnable({ 
                                run: () => { targetTile.setNet(virusBlock, currentTeam, 0); } 
                            }));
                        }
                    }
                }
            },

            display(table) {
                this.super$display(table);
                table.row();
                
                table.table(cons(t => {
                    let label = t.add("").left().get();
                    
                    label.update(() => {
                        if (this.team == Team.derelict) {
                            label.setText("[gray]Infection Frozen (Derelict)");
                            return;
                        }

                        let requiredTicks = EVOLUTION_TIMES_MINUTES[this.stage] * 60 * 60;
                        let remainingSeconds = Math.max(0, Math.ceil((requiredTicks - this.evolutionTimer) / 60));
                        
                        let content = "[purple]Tumor Stage: " + this.stage + " / " + MAX_STAGE + "\n";
                        if (this.stage < MAX_STAGE) { 
                            content += "[green]Next Mutation: " + remainingSeconds + " sec."; 
                        } else { 
                            content += "[gold]Maximum Mutation"; 
                        }
                        
                        label.setText(content);
                    });
                })).expandX().left();
            }
        }));
    }
});

virusHiveBlock = extend(Block, "virus-hive", {
    init() {
        this.super$init();
        this.localizedName = "Virus Hive";
        this.description = "Creates virus infection and spawns bio-units.";
        this.category = Category.defense; 
        this.size = 2; 
        this.health = 800; 
        this.solid = true;
        this.update = true;
        this.destructible = true;
        this.drawTeamOverlay = false;

        for (let i = 1; i <= MAX_STAGE; i++) {
            hiveRegions[i] = Core.atlas.find(this.name + "-stage" + i);
        }

        this.buildType = prov(() => extend(Building, {
            stage: 1,
            evolutionTimer: 0,
            spreadTimer: 0,
            spawnTimer: 0, 
            bonusHealth: 0, 

            maxHealth() {
                return this.super$maxHealth() + this.bonusHealth;
            },

            // 1. ЗАЩИТА ОТ СМЕНЫ КОМАНДЫ ДЛЯ УЛЬЯ
            changeTeam(next) {
                if (next == Team.sharded || next == Team.crux || next == Team.derelict) {
                    Core.app.post(new java.lang.Runnable({
                        run: () => { this.kill(); }
                    }));
                    return;
                }
                this.super$changeTeam(next);
            },

            updateTile() {
                this.super$updateTile();

                // 2. САМОУНИЧТОЖЕНИЕ УЛЬЯ ПРИ ПЕРЕХОДЕ В DERELICT
                if (this.team == Team.derelict) {
                    this.kill();
                    return;
                }

                if (this.stage < MAX_STAGE) {
                    this.evolutionTimer += Time.delta;
                    let requiredTicks = EVOLUTION_TIMES_MINUTES[this.stage] * 60 * 60;
                    if (this.evolutionTimer >= requiredTicks) {
                        this.stage++;
                        this.evolutionTimer = 0;
                        this.bonusHealth += 400; 
                        this.health += 400; 
                    }
                }

                this.spreadTimer += Time.delta;
                let currentSpreadDelay = SPREAD_TIME / (this.stage * 0.5 + 0.5);
                if (this.spreadTimer >= currentSpreadDelay) {
                    this.spreadTimer = 0;
                    this.trySpread();
                }

                if (this.stage >= 3) {
                    this.spawnTimer += Time.delta;
                    if (this.spawnTimer >= SPAWN_INTERVAL_SECONDS * 60) {
                        this.spawnTimer = 0;
                        this.trySpawnUnit();
                    }
                }
            },

            trySpawnUnit() {
                let currentTeam = this.team; 
                let spawnX = this.x; 
                let spawnY = this.y; 
                let currentStage = this.stage;

                Core.app.post(new java.lang.Runnable({
                    run: () => {
                        let unitToSpawn = null;
                        
                        if (currentStage == 3 || currentStage == 4) { 
                            unitToSpawn = Vars.content.unit("mo-02d-03-remainder"); 
                        } else if (currentStage == 5) { 
                            unitToSpawn = Vars.content.unit("mo-02d-07-revival"); 
                        }

                        if (unitToSpawn == null) {
unitToSpawn = UnitTypes.crawler;}if (unitToSpawn != null) {unitToSpawn.spawn(currentTeam, spawnX, spawnY);}}}));},draw() {let region = hiveRegions[this.stage];if (region != null && region.found()) {let offset = Vars.tilesize / 2;Draw.rect(region, this.x + offset, this.y + offset);} else {this.super$draw();}},trySpread() {let baseTileX = Math.floor((this.x - (this.block.size - 1) * Vars.tilesize / 2) / Vars.tilesize);let baseTileY = Math.floor((this.y - (this.block.size - 1) * Vars.tilesize / 2) / Vars.tilesize);let directions = [{x: 2, y: 0}, {x: 2, y: 1},{x: -1, y: 0}, {x: -1, y: 1},{x: 0, y: 2}, {x: 1, y: 2},{x: 0, y: -1}, {x: 1, y: -1}];let dir = directions[Math.floor(Math.random() * directions.length)];let targetTile = Vars.world.tile(baseTileX + dir.x, baseTileY + dir.y);if (targetTile != null) {let build = targetTile.build;let currentTeam = this.team;if (build == null && targetTile.block().id == Blocks.air.id) {Core.app.post(new java.lang.Runnable({run: () => {targetTile.setNet(virusBlock, currentTeam, 0);}}));}}},display(table) {this.super$display(table);table.row();table.table(cons(t => {let label = t.add("").left().get();label.update(() => {if (this.team == Team.derelict) {label.setText("[gray]Hive Frozen (Derelict)");return;}let requiredTicks = EVOLUTION_TIMES_MINUTES[this.stage] * 60 * 60;let remainingSeconds = Math.max(0, Math.ceil((requiredTicks - this.evolutionTimer) / 60));let remainingSpawn = Math.max(0, Math.ceil(((SPAWN_INTERVAL_SECONDS * 60) - this.spawnTimer) / 60));let content = "[purple]Hive Stage: " + this.stage + " / " + MAX_STAGE + "\n";if (this.stage < MAX_STAGE) {content += "[green]Next Hive Mutation: " + remainingSeconds + " sec.\n";} else {content += "[gold]Maximum Hive Mutation\n";}if (this.stage >= 3) {content += "[scarlet]Unit Incubation: " + remainingSpawn + " sec.";} else {content += "[gray]Incubators are not ready yet";}label.setText(content);});})).expandX().left();}}));}});
