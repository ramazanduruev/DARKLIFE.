

//пузырьки в ветке технологий

Events.on(ClientLoadEvent, () => {
    const research = Vars.ui.research;
    const bubbles = [];
    const bubbleCount = 30;

    for(let i = 0; i < bubbleCount; i++){
        bubbles.push({
            x: Math.random() * Core.graphics.getWidth(),
            y: Math.random() * Core.graphics.getHeight(),
            speed: 0.5 + Math.random() * 1.5,
            radius: 6 + Math.random() * 8,
            sinOffset: Math.random() * 10,
            opacity: 0.2 + Math.random() * 0.5
        });
    }

    
    const bubbleLayer = extend(Element, {
        draw(){
           
            this.super$draw();

            Draw.color(Color.white);

            bubbles.forEach(b => {
                b.y += b.speed;
                let displayX = b.x + Math.sin((Time.time + b.sinOffset) / 20) * 15;

                if(b.y > Core.graphics.getHeight() + 20) {
                    b.y = -20;
                    b.x = Math.random() * Core.graphics.getWidth();
                }

                
                Draw.alpha(b.opacity * 0.5);
                Lines.stroke(1.5);
                Lines.circle(displayX, b.y, b.radius);

            
                Draw.alpha(b.opacity * 0.8);
                Fill.circle(displayX + b.radius/3, b.y + b.radius/3, b.radius/4);
            });
            
            Draw.reset(); 
        }
    });

    bubbleLayer.setFillParent(true);
    bubbleLayer.touchable = Touchable.disabled;

    research.addChildAt(0, bubbleLayer);
});





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


