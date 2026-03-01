var langPack, updateMenuLanguage, rebuildChatUI, chatHistory, currentLang, networkStatus, countOnline, countTotal, chatDialog, textField, chatBoxTable, localName, deviceIcon, statusLabel, counterLabel, vpnLabel;

Events.on(ClientLoadEvent, () => {
    const SERVER_URL = "https://mindustry-chat.onrender.com"; 

    currentLang = "ru"; 
    chatHistory = [];
    networkStatus = "[scarlet]Проверка связи...";
    countOnline = 0;
    countTotal = 0;
    deviceIcon = Vars.android ? " " : " ";

    let bubbles = [];
    for(let i = 0; i < 15; i++) {
        bubbles.push({
            x: Math.random() * 440,
            y: Math.random() * 230,
            size: Math.random() * 3 + 2,
            speed: Math.random() * 0.7 + 0.4
        });
    }

    const defaultStyle = Core.scene.getStyle(Dialog.DialogStyle);
    const dialogStyle = new Dialog.DialogStyle();
    dialogStyle.titleFont = defaultStyle.titleFont;
    dialogStyle.titleFontColor = Color.cyan; 

    chatDialog = new BaseDialog("Global Chat", dialogStyle);
    chatDialog.cont.clear();

    const pixmap = new Pixmap(2, 2);
    pixmap.fill(new Color(0.04, 0.05, 0.08, 1.0)); 
    chatDialog.background(new TextureRegionDrawable(new TextureRegion(new Texture(pixmap))));

    localName = (Vars.player && Vars.player.name) ? Vars.player.name : "Player_" + Math.floor(Math.random() * 9000 + 1000);
    localName = localName.replace(/\[.*?\]/g, "").trim();

    const rightContainer = new Table().left();
    rightContainer.background(Styles.black6);
    rightContainer.margin(12);

    const topInfoTable = new Table().left();
    statusLabel = new Label("", Styles.outlineLabel);
    topInfoTable.add(statusLabel).left();
    rightContainer.add(topInfoTable).left().padBottom(2).row();

    counterLabel = new Label("", Styles.outlineLabel);
    rightContainer.add(counterLabel).left().padBottom(10).row();

    chatBoxTable = new Table().top().left();
    chatBoxTable.background(Styles.black3); 
    chatBoxTable.margin(10); 

    chatBoxTable.update(run(() => {
        for(let i = 0; i < bubbles.length; i++) {
            let b = bubbles[i];
            b.y += b.speed;
            if(b.y > 230) {
                b.y = 0;
                b.x = Math.random() * 440;
            }
        }
    }));

    rightContainer.add(chatBoxTable).width(450).height(240).padBottom(6).row();

    vpnLabel = new Label("", Styles.outlineLabel);
    vpnLabel.setWrap(true);
    rightContainer.add(vpnLabel).width(450).left().padBottom(6).row();

    const inputTable = new Table().left();
    textField = new TextField("");
    inputTable.add(textField).width(380).height(46).padRight(10);

    langPack = {
        en: {
            title: "🌐 GLOBAL CHAT", placeholder: "Type a message...", 
            statusConnecting: "[yellow]Connecting...", statusReady: "[green]Online", 
            statusDisconnected: "[scarlet]Offline", titleAI: "Status",
            vpnWarning: "[yellow]⚠ Tip: Use a VPN if chat loads slowly."
        },
        ru: {
            title: "🌐 МИРОВОЙ ЧАТ", placeholder: "Введите сообщение...", 
            statusConnecting: "[yellow]Подключение...", statusReady: "[green]В сети", 
            statusDisconnected: "[scarlet]Выключен", titleAI: "Статус сети",
            vpnWarning: "[yellow]⚠ Рекомендуем включить VPN для быстрой связи!"
        }
    };

    rebuildChatUI = () => {
        chatBoxTable.clear();
        chatHistory.forEach(line => {
            let lbl = new Label(line, Styles.outlineLabel);
            lbl.setWrap(true);
            chatBoxTable.add(lbl).width(430).left().padBottom(4).row();
        });
    };

    updateMenuLanguage = () => {
        let p = langPack[currentLang];
        chatDialog.title.setText(p.title);
        textField.setMessageText(p.placeholder);
        statusLabel.setText("[lightgray]" + p.titleAI + ": " + networkStatus);
        
        if (networkStatus.includes("В сети") || networkStatus.includes("Online")) {
            let onlineColor = countOnline > 1 ? "[green]" : "[yellow]";
            counterLabel.setText("[gray]Online: " + onlineColor + countOnline + " [gray]| Total Members: [cyan]" + countTotal);
        } else {
            counterLabel.setText("[gray]Online: [red]? [gray]| Total Members: [red]?");
        }
        vpnLabel.setText(p.vpnWarning);
    };

    function fetchChatMessages() {
        if (!chatDialog.isShown()) return;
        
        let encodedName = java.net.URLEncoder.encode(localName, "UTF-8");
        let requestUrl = SERVER_URL + "?user=" + encodedName;

        Threads.daemon(run(() => {
            try {
                let url = new java.net.URL(requestUrl);
                let connection = url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(3000);
                connection.setReadTimeout(3000);

                let is = connection.getInputStream();
                let reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, "UTF-8"));
                let response = new java.lang.StringBuilder();
                let line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                let resData = JSON.parse(response.toString());
                if (resData.history) {
                    chatHistory = resData.history;
                    countOnline = resData.online || 0;
                    countTotal = resData.total || 0;
                    networkStatus = langPack[currentLang].statusReady;
                }
            } catch (e) {
                networkStatus = langPack[currentLang].statusDisconnected;
            }

            Core.app.post(run(() => {
                updateMenuLanguage();
                rebuildChatUI();
            }));
        }));
    }
    const sendGlobalMessage = () => {
        let text = textField.getText().trim();
        if (text === "") return;

        textField.setText("");
        
        let formattedMessage = "";
        if (localName.toLowerCase() === "votak") {
            formattedMessage = "[gold]👑 VoTaK [gray]: [white]" + text;
        } else {
            formattedMessage = "[cyan]" + deviceIcon + localName + " [gray]: [white]" + text;
        }
        
        let jsonPayload = JSON.stringify({ msg: formattedMessage, user: localName });

        Threads.daemon(run(() => {
            try {
                let url = new java.net.URL(SERVER_URL);
                let connection = url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setDoOutput(true);
                connection.setConnectTimeout(3000);

                let os = connection.getOutputStream();
                let writer = new java.io.BufferedWriter(new java.io.OutputStreamWriter(os, "UTF-8"));
                writer.write(jsonPayload);
                writer.flush();
                writer.close();
                os.close();

                connection.getInputStream().close();
                fetchChatMessages();
            } catch(e) {}
        }));
    };

    inputTable.button(Icon.right, run(() => { sendGlobalMessage(); })).size(60, 46);
    rightContainer.add(inputTable).width(450);

    rightContainer.row();
    rightContainer.button("  ❌  ", run(() => { chatDialog.hide(); })).size(450, 35).padTop(10);

    chatDialog.cont.add(rightContainer).expand().center();

    let toggleTable = new Table();
    toggleTable.setFillParent(true);
    toggleTable.top().right(); 
    
    toggleTable.button(Icon.chat, run(() => {
        if (chatDialog.isShown()) {
            chatDialog.hide();
        } else {
            chatDialog.show();
            fetchChatMessages();
        }
    })).size(60, 60).padTop(35).padRight(35); 

    Core.scene.add(toggleTable);

    chatDialog.update(run(() => {
        let actualLang = (Core.settings.get("locale", "en") === "ru") ? "ru" : "en";
        if (actualLang !== currentLang) {
            currentLang = actualLang;
            updateMenuLanguage();
        }
    }));

    updateMenuLanguage();

    Timer.schedule(() => {
        if (chatDialog.isShown()) {
            fetchChatMessages();
        }
    }, 1.0, 3.0);
});

