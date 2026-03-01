var langPack, updateMenuLanguage, rebuildChatUI, chatHistory, currentLang, networkStatus, countOnline, countTotal, chatDialog, textField, chatBoxTable, localName, deviceIcon, statusLabel, counterLabel, vpnLabel;
var playersProgress = {};
var myMenu = null;

Events.on(ClientLoadEvent, () => {

    const SERVER_URL = "https://mindustry-chat.onrender.com"; 

    currentLang = "en"; 
    chatHistory = [];
    networkStatus = "[scarlet]Connecting...";
    countOnline = 0;
    countTotal = 0;
    deviceIcon = Vars.android ? " " : " ";

    Timer.schedule(() => {
        playersProgress["Dark_Core"] = 39;
        playersProgress["Player_777"] = 12;
    }, 2.0);

    let sphereRotation = 0;
    let hologramPoints = [];
    let sectorImages = []; 
    let sectorsInitialized = false;
    let sectorContainer = null; 
    let radarLine = null;
    const MAX_SECTORS = 150;

    for (let i = 0; i < MAX_SECTORS; i++) {
        hologramPoints.push({
            origX: 0, origY: 0, origZ: 0,
            id: 0, name: "Scanning...", status: "NONE",
            pulse: Math.random() * 2, hasData: false, realSector: null
        });
    }

    localName = (Vars.player && Vars.player.name) ? Vars.player.name : "Player_" + Math.floor(Math.random() * 9000 + 1000);
    localName = localName.replace(/\[.*?\]/g, "").trim();

    langPack = {
        en: { title: "GLOBAL CHAT", placeholder: "Type a message...", statusConnecting: "[yellow]Connecting...", statusReady: "[green]Online", statusDisconnected: "[scarlet]Offline", titleAI: "Network Status", vpnWarning: "[yellow]Tip: Use a VPN if chat loads slowly." },
        ru: { title: "МИРОВОЙ ЧАТ", placeholder: "Введите сообщение...", statusConnecting: "[yellow]Подключение...", statusReady: "[green]В сети", statusDisconnected: "[scarlet]Выключен", titleAI: "Статус сети", vpnWarning: "[yellow]Рекомендуем включить VPN для быстрой связи!" }
    };

    rebuildChatUI = () => {
        chatBoxTable.clear();
        chatHistory.forEach(line => {
            let lbl = new Label(line, Styles.outlineLabel); lbl.setWrap(true);
            chatBoxTable.add(lbl).width(430).left().padBottom(4).row();
        });
    };

    updateMenuLanguage = () => {
        let p = langPack[currentLang];
        chatDialog.title.setText(p.title); textField.setMessageText(p.placeholder); statusLabel.setText("[lightgray]" + p.titleAI + ": " + networkStatus);
        if (networkStatus.includes("Online") || networkStatus.includes("В сети")) {
            let onlineColor = countOnline > 1 ? "[green]" : "[yellow]";
            if (currentLang === "ru") {
                counterLabel.setText("[gray]В сети: " + onlineColor + countOnline + " [gray]| Всего участников: [cyan]" + countTotal);
            } else {
                counterLabel.setText("[gray]Online: " + onlineColor + countOnline + " [gray]| Total Members: [cyan]" + countTotal);
            }
        } else { 
            if (currentLang === "ru") {
                counterLabel.setText("[gray]В сети: [red]? [gray]| Всего участников: [red]?");
            } else {
                counterLabel.setText("[gray]Online: [red]? [gray]| Total Members: [red]?");
            }
        }
        vpnLabel.setText(p.vpnWarning);
    };

    function fetchChatMessages() {
        if (!chatDialog.isShown()) return;
        let encodedName = java.net.URLEncoder.encode(localName, "UTF-8");
        let requestUrl = SERVER_URL + "?user=" + encodedName;
        let req = Http.get(requestUrl);
        req.timeout = 15000;
        req.header("User-Agent", "Mozilla/5.0")
           .error(e => { networkStatus = langPack[currentLang].statusDisconnected; Core.app.post(run(() => { updateMenuLanguage(); rebuildChatUI(); })); })
           .submit(response => {
                try {
                    let resData = JSON.parse(response.getResultAsString());
                    if (resData.history) { chatHistory = resData.history; countOnline = resData.online || 0; countTotal = resData.total || 0; networkStatus = langPack[currentLang].statusReady; }
                } catch(e) { networkStatus = langPack[currentLang].statusDisconnected; }
                Core.app.post(run(() => { updateMenuLanguage(); rebuildChatUI(); }));
           });
    }

    const sendGlobalMessage = () => {
        let text = textField.getText().trim();
        if (text === "") return;
        textField.setText("");
        
        let formattedMessage = (localName.toLowerCase() === "votak") ? "[gold]VoTaK [gray]: [white]" + text : "[cyan]" + deviceIcon + localName + " [gray]: [white]" + text;
        let jsonPayload = JSON.stringify({ msg: formattedMessage, user: localName });

        let req = Http.post(SERVER_URL, jsonPayload);
        req.timeout = 15000;
        req.header("Content-Type", "application/json; charset=utf-8").header("User-Agent", "Mozilla/5.0").submit(response => { fetchChatMessages(); });
    };

    function setupHologramSectors() {
        let myPlanet = null;
        let allPlanets = Vars.content.planets();
        
        for(let i = 0; i < allPlanets.size; i++) {
            let p = allPlanets.get(i);
            if(p.name.includes("cilistis") || p.localizedName.toLowerCase().includes("cilistis")) {
                myPlanet = p;
                break;
            }
        }

        if (myPlanet && myPlanet.sectors && myPlanet.sectors.size > 0 && sectorContainer) {
            let totalSectorsCount = myPlanet.sectors.size; 
            
            hologramPoints = [];
            sectorImages = [];
            sectorContainer.clear(); 

            radarLine = new Image(Tex.whiteui);
            radarLine.setColor(Color.cyan.cpy().mul(0.25)); 
            radarLine.setSize(170, 2);
            radarLine.setOrigin(0, 1); 
            sectorContainer.addChild(radarLine);
            radarLine.setPosition(175, 175);

            for (let i = 0; i < totalSectorsCount; i++) {
                let sector = myPlanet.sectors.get(i);

                hologramPoints.push({
                    origX: sector.tile.v.x,
                    origY: sector.tile.v.y,
                    origZ: sector.tile.v.z,
                    id: sector.id,
                    name: sector.localizedName ? sector.localizedName : "sector-" + sector.id,
                    status: "NONE", 
                    pulse: Math.random() * 2, 
                    realSector: sector, 
                    hasData: true
                });

                let img = new Image(Tex.whiteui);
                img.setColor(Color.clear);
                sectorContainer.addChild(img);
                sectorImages.push(img);
            }
            sectorsInitialized = true;
        }
    }
    function buildMainMenuUI() {
        if (Vars.state.isGame()) return; 
        
        if (myMenu != null && myMenu.isShown()) return;

        const defaultStyle = Core.scene.getStyle(Dialog.DialogStyle);
        const dialogStyle = new Dialog.DialogStyle();
        dialogStyle.titleFont = defaultStyle.titleFont; dialogStyle.titleFontColor = Color.cyan; 

        chatDialog = new BaseDialog("Global Chat", dialogStyle);
        chatDialog.cont.clear();

        const pixmap = new Pixmap(2, 2); pixmap.fill(new Color(0.04, 0.05, 0.08, 1.0)); 
        chatDialog.background(new TextureRegionDrawable(new TextureRegion(new Texture(pixmap))));

        const rightContainer = new Table().left(); rightContainer.background(Styles.black6); rightContainer.margin(12);
        const topInfoTable = new Table().left(); statusLabel = new Label("", Styles.outlineLabel); topInfoTable.add(statusLabel).left(); rightContainer.add(topInfoTable).left().padBottom(2).row();
        counterLabel = new Label("", Styles.outlineLabel); rightContainer.add(counterLabel).left().padBottom(10).row();

        chatBoxTable = new Table().top().left(); chatBoxTable.background(Styles.black3); chatBoxTable.margin(10); 
        rightContainer.add(chatBoxTable).width(450).height(240).padBottom(6).row();

        vpnLabel = new Label("", Styles.outlineLabel); vpnLabel.setWrap(true); rightContainer.add(vpnLabel).width(450).left().padBottom(6).row();
        const inputTable = new Table().left(); textField = new TextField(""); inputTable.add(textField).width(380).height(46).padRight(10);
        inputTable.button(Icon.right, run(() => { sendGlobalMessage(); })).size(60, 46); rightContainer.add(inputTable).width(450).row();
        rightContainer.button("  ❌  ", run(() => { chatDialog.hide(); })).size(450, 35).padTop(10); chatDialog.cont.add(rightContainer).expand().center();

        chatDialog.update(run(() => { let actualLang = (Core.settings.get("locale", "en") === "ru") ? "ru" : "en"; if (actualLang !== currentLang) { currentLang = actualLang; updateMenuLanguage(); } }));
        updateMenuLanguage();

        myMenu = new BaseDialog("");
        myMenu.setFillParent(true); myMenu.setBackground(Tex.whiteui); myMenu.setColor(new Color(0.02, 0.05, 0.1, 1.0));
        
        const rootTable = myMenu.cont;
        rootTable.clear();
        rootTable.left().margin(30);

        const leftContainer = new Table().left().top(); rootTable.add(leftContainer).top().left();
        let titleLabel = new Label("MINDUSTRY: CILISTIS", Styles.outlineLabel); titleLabel.setColor(Color.cyan); leftContainer.add(titleLabel).left().padBottom(20).row();
        const buttonTable = new Table().left().top(); leftContainer.add(buttonTable).left().top().row();

        function addMenuButton(text, action) {
            let btn = new TextButton(text, Styles.defaultt); btn.setColor(Color.cyan);
            btn.changed(() => { try { action(); } catch(e) { Log.err("Button error '" + text + "': " + e); } });
            buttonTable.add(btn).size(320, 46).left().padBottom(6).row();
        }

        addMenuButton("Campaign", () => { Core.app.post(run(() => { if(myMenu) myMenu.hide(); Vars.ui.planet.show(); })); });
        addMenuButton("Multiplayer", () => { Core.app.post(run(() => { if(myMenu) myMenu.hide(); Vars.ui.join.show(); })); });
        addMenuButton("Global Chat", () => { if (!chatDialog.isShown()) { chatDialog.show(); fetchChatMessages(); } });
        addMenuButton("Mods", () => { if (Vars.ui && Vars.ui.mods) { if(myMenu) myMenu.hide(); Vars.ui.mods.show(); } });
        addMenuButton("Map Editor", () => { if (Vars.ui && Vars.ui.maps) { if(myMenu) myMenu.hide(); Vars.ui.maps.show(); } });
        addMenuButton("Custom Game", () => { if (Vars.ui && Vars.ui.custom) { if(myMenu) myMenu.hide(); Vars.ui.custom.show(); } });
        addMenuButton("Settings", () => { if (Vars.ui && Vars.ui.settings) { if(myMenu) myMenu.hide(); Vars.ui.settings.show(); } });
        addMenuButton("Exit", () => { Core.app.exit(); });

        const rightMenuContainer = new Table().top(); rootTable.add(rightMenuContainer).padLeft(40).top();
        
        let sectorTitle = new Label("[cyan]SECTORS PROJECTION", Styles.outlineLabel); 
        rightMenuContainer.add(sectorTitle).center().padBottom(10).row();

        let radarWidget = new Table().background(Styles.black3).margin(4);
        sectorContainer = new Table().background(Styles.black3); 
        radarWidget.add(sectorContainer).size(350, 350).center().row();
        rightMenuContainer.add(radarWidget).size(360, 360).center().row();

        let placeholderAxisH = new Image(Tex.whiteui); placeholderAxisH.setColor(Color.cyan.cpy().mul(0.08)); placeholderAxisH.setSize(330, 1); sectorContainer.addChild(placeholderAxisH); placeholderAxisH.setPosition(10, 175);
        let placeholderAxisV = new Image(Tex.whiteui); placeholderAxisV.setColor(Color.cyan.cpy().mul(0.08)); placeholderAxisV.setSize(1, 330); sectorContainer.addChild(placeholderAxisV); placeholderAxisV.setPosition(175, 10);

        const updateLogContainer = new Table().top().left();
        updateLogContainer.background(Styles.black3);
        updateLogContainer.margin(16);
        rootTable.add(updateLogContainer).padLeft(35).top().width(320).height(410);

        let logTitle = new Label("[cyan]UPDATE LOG v1.4.0", Styles.outlineLabel);
        updateLogContainer.add(logTitle).left().padBottom(15).row();

        function addLogLine(text) {
            let lineLabel = new Label(text, Styles.outlineLabel);
            lineLabel.setWrap(true);
            updateLogContainer.add(lineLabel).left().width(290).padBottom(8).row();
        }

        addLogLine("- Operational Global Chat integration");
        addLogLine("- 3D planetary holographic projection");
        addLogLine("- Full code overhaul and optimization");
        addLogLine("- Removed non-functional interfaces");

        updateLogContainer.add().expandY().row(); 
        let versionStatus = new Label("[green]● Latest Version Installed", Styles.outlineLabel);
        updateLogContainer.add(versionStatus).left().padBottom(4);
        myMenu.update(run(() => {
            if (Vars.state.isGame()) {
                if (myMenu.isShown()) myMenu.hide();
            }
        }));

        radarWidget.update(run(() => {
            if (Vars.state.isGame()) return; 

            sphereRotation += 0.012; if(sphereRotation > Math.PI * 2) sphereRotation = 0;
            if (radarLine) radarLine.setRotation(sphereRotation * 57.2957); 
            let cosAlpha = Math.cos(sphereRotation); let sinAlpha = Math.sin(sphereRotation);

            if (!sectorsInitialized) setupHologramSectors();

            let myCapturedCount = 0; let totalSectorsCount = 0;

            for(let i = 0; i < hologramPoints.length; i++) {
                let s = hologramPoints[i]; let img = sectorImages[i];
                if (!s || !img || !s.hasData) continue;

                totalSectorsCount++;
                
                if (s.realSector) {
                    if (String(s.realSector.isCaptured()) === "true") {
                        s.status = (currentLang === "ru") ? "ЗАХВАЧЕН" : "CAPTURED";
                        myCapturedCount++;
                    } else if (String(s.realSector.isAttacked()) === "true") {
                        s.status = (currentLang === "ru") ? "ДОСТУПЕН" : "AVAILABLE";
                    } else {
                        s.status = (currentLang === "ru") ? "НЕ ЗАХВАЧЕН" : "NOT CAPTURED";
                    }
                }

                s.pulse += 0.07; if(s.pulse > Math.PI * 2) s.pulse = 0;
                let rotX = s.origX * cosAlpha - s.origZ * sinAlpha; let rotZ = s.origX * sinAlpha + s.origZ * cosAlpha; let rotY = s.origY;
                
                let screenX = 175 + rotX * 155; let screenY = 175 + rotY * 155;
                let depthScale = (rotZ + 1) / 2; let alpha = 0.12 + depthScale * 0.80; let finalSize = (6 + depthScale * 6) * (1.0 + Math.sin(s.pulse) * 0.12);

                if(s.status === "CAPTURED" || s.status === "ЗАХВАЧЕН") { 
                    img.setColor(new Color(0.0, 1.0, 0.2, alpha)); 
                } else if(s.status === "AVAILABLE" || s.status === "ДОСТУПЕН") {
                    img.setColor(new Color(1.0, 0.6, 0.0, alpha)); 
                } else { 
                    img.setColor(new Color(1.0, 0.15, 0.15, alpha)); 
                }
                
                img.setOrigin(finalSize / 2, finalSize / 2); img.setRotation(45); img.setSize(finalSize, finalSize);
                img.setPosition(screenX - finalSize / 2, screenY - finalSize / 2);
            }
            if (currentLang === "ru") {
                sectorTitle.setText("[cyan]ПРОЕКЦИЯ СЕКТОРОВ [gray](" + myCapturedCount + " / " + totalSectorsCount + ")");
            } else {
                sectorTitle.setText("[cyan]SECTORS PROJECTION [gray](" + myCapturedCount + " / " + totalSectorsCount + ")");
            }
        }));

        let sectorLog = new Label("", Styles.outlineLabel); sectorLog.setWrap(true);
        sectorLog.update(run(() => {
            if (Vars.state.isGame()) return;
            let activeSectors = [];
            for (let i = 0; i < hologramPoints.length; i++) { if (hologramPoints[i] && hologramPoints[i].hasData) activeSectors.push(hologramPoints[i]); }
            if (activeSectors.length > 0) {
                let index = Math.floor((sphereRotation / (Math.PI * 2)) * activeSectors.length) % activeSectors.length;
                let active = activeSectors[index]; 
                if (active) {
                    if (currentLang === "ru") {
                        sectorLog.setText("[gray]Сканирование: [white]mo-" + active.name + " [gray]| ID: [cyan]" + active.id);
                    } else {
                        sectorLog.setText("[gray]Scanning: [white]mo-" + active.name + " [gray]| ID: [cyan]" + active.id);
                    }
                }
            }
        }));
        rightMenuContainer.add(sectorLog).width(350).padTop(10).center();

        sectorsInitialized = false; 
        myMenu.show();
    }

    Events.on(StateChangeEvent, (event) => {
        Timer.schedule(() => {
            if (!Vars.state.isGame()) {
                sectorsInitialized = false;
                buildMainMenuUI();
            } else {
                if (myMenu != null) myMenu.hide();
            }
        }, 0.2);
    });

    // СПАМ-ТРИГГЕР: Проверяем каждый кадр игры, нужно ли форсированно открыть наше меню
    Events.run(Trigger.update, () => {
        // Если игрок находится внутри матча — спам полностью отключается
        if (Vars.state.isGame()) return;

        let standardUiOpen = false;
        if (Vars.ui) {
            if ((Vars.ui.planet && Vars.ui.planet.isShown()) ||
                (Vars.ui.join && Vars.ui.join.isShown()) ||
                (Vars.ui.mods && Vars.ui.mods.isShown()) ||
                (Vars.ui.maps && Vars.ui.maps.isShown()) ||
                (Vars.ui.settings && Vars.ui.settings.isShown()) ||
                (Vars.ui.custom && Vars.ui.custom.isShown()) ||
                (chatDialog && chatDialog.isShown())) {
                standardUiOpen = true;
            }
        }

        // Если все дефолтные подменю закрыты, а наше меню почему-то скрылось (например, от кнопки Назад)
        if (!standardUiOpen) {
            buildMainMenuUI();
            if (myMenu && !myMenu.isShown()) {
                myMenu.show();
            }
            // Гарантированно скрываем стандартный задник кнопок игры, если он пытается вылезти
            if (Vars.ui && Vars.ui.menu && Vars.ui.menu.isShown()) {
                Vars.ui.menu.hide();
            }
        }
    });

    buildMainMenuUI();
});

