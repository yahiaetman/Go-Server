import {app, BrowserWindow} from 'electron';

interface Size {
    width: number,
    height: number
}

class Main {
    static window: Electron.BrowserWindow | null;

    private static CreateWindow(){
        const contentSize: Size = {width: 1280, height: 720};
        const shadowSize: Size = {width: 25, height: 25};
        Main.window = new BrowserWindow({
            width: contentSize.width + shadowSize.width,
            height: contentSize.height + shadowSize.height,
            resizable: false,
            frame: false,
            transparent: true,
            hasShadow: false,
            webPreferences: { nodeIntegration: true }
        });
        Main.window.loadFile('dist/renderer/index.html');
        //Main.window.loadURL(`file://${__dirname}/../renderer/index.html`);
        Main.window.setMenu(null);
        //Main.window.webContents.openDevTools();
        
        Main.window.webContents.on('did-finish-load', ()=>{});

        Main.window.on('closed', ()=>{
            Main.window=null;
        });
    }

    public static main(){
        app.on('ready', Main.CreateWindow);
        app.on('window-all-closed', ()=>{ app.quit(); });
        app.on('activate', ()=>{ if(Main.window == null) Main.CreateWindow(); });
    }
}

Main.main();