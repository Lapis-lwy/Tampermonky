// ==UserScript==
// @name         PixivInfo
// @namespace    http://tampermonkey.net/
// @version      14.6
// @description  查看本地是否存在该图片
// @author       Lapis_lwy
// @match        *://www.pixiv.net/*
// @match        *://danbooru.donmai.us/*
// @icon         https://www.pixiv.net/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      file.125114.xyz
// @updateURL    https://raw.githubusercontent.com/Lapis-lwy/Tampermonky/refs/heads/main/PixivInfo.user.js
// @downloadURL  https://raw.githubusercontent.com/Lapis-lwy/Tampermonky/refs/heads/main/PixivInfo.user.js
// ==/UserScript==
//TODO:增加识别图集部分图片

let _wr = function (type) {
    let orig = history[type];
    return function () {
        let rv = orig.apply(this, arguments);
        let e = new Event(type);
        e.arguments = arguments;
        window.dispatchEvent(e);
        return rv;
    };
};
let noneArr = [undefined, null, ""];
const url = "https://file.125114.xyz:23475/api/";
// 显示通知
function notify(msg, type = "info") {
    const colors = { success: "#4CAF50", error: "#f44336", warning: "#ff9800", info: "#2196F3" };
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = `
            position: fixed; bottom: 60px; left: 20px; padding: 10px 20px;
            background: ${colors[type] || colors.info}; color: white;
            border-radius: 4px; font-size: 14px; z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 0.3s";
        setTimeout(() => el.remove(), 300);
    }, 1500);
}
function loginUi(div) {
    // 检查登录状态
    function isLoggedIn() {
        if (typeof GM_getValue !== 'function') return false;
        const u = GM_getValue("username"), p = GM_getValue("password");
        return u && u.trim() && p && p.trim();
    }

    // 创建主容器
    let log = document.createElement("div");
    log.id = "login";

    // 创建登录按钮（左下角）
    let loginBtn = document.createElement("button");
    loginBtn.innerHTML = "🔑 登录";
    loginBtn.style.cssText = `
        position: fixed; bottom: 20px; left: 20px;
        padding: 10px 20px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9998;
        transition: all 0.3s ease;
    `;
    loginBtn.onmouseover = () => {
        if (loginBtn.style.background !== "#4CAF50") {
            loginBtn.style.background = "#1976D2";
        }
    };
    loginBtn.onmouseout = () => {
        if (loginBtn.style.background !== "#4CAF50") {
            loginBtn.style.background = "#2196F3";
        }
    };

    // 创建登录弹窗
    let loginBox = document.createElement("div");
    loginBox.style.cssText = `
        position: fixed; bottom: 80px; left: 20px;
        background: rgba(255,255,255,0.98);
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        display: none;
        min-width: 250px;
        backdrop-filter: blur(10px);
    `;

    // 弹窗标题和关闭按钮
    let titleBar = document.createElement("div");
    titleBar.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;";

    let title = document.createElement("span");
    title.textContent = "用户登录";
    title.style.cssText = "font-size: 16px; font-weight: bold; color: #333;";
    titleBar.appendChild(title);

    let closeBox = document.createElement("span");
    closeBox.textContent = "×";
    closeBox.style.cssText = "cursor: pointer; color: #999; font-size: 20px; line-height: 1;";
    closeBox.onclick = () => loginBox.style.display = "none";
    titleBar.appendChild(closeBox);
    loginBox.appendChild(titleBar);

    // 用户名
    let userTip = document.createElement("label");
    userTip.textContent = "用户名：";
    userTip.style.cssText = "font-size: 14px; color: #333; display: block; margin-bottom: 5px;";
    loginBox.appendChild(userTip);

    let user = document.createElement("input");
    user.type = "text";
    user.id = "username";
    user.placeholder = "请输入用户名";
    user.autocomplete = "off";
    user.style.cssText = `
        width: 100%; padding: 8px 10px;
        border: 1px solid #ddd; border-radius: 4px;
        font-size: 14px; margin-bottom: 12px;
        box-sizing: border-box;
    `;
    userTip.htmlFor = "username";
    loginBox.appendChild(user);

    // 密码
    let passTip = document.createElement("label");
    passTip.textContent = "密码：";
    passTip.style.cssText = "font-size: 14px; color: #333; display: block; margin-bottom: 5px;";
    loginBox.appendChild(passTip);

    let passwd = document.createElement("input");
    passwd.type = "password";
    passwd.id = "password";
    passwd.placeholder = "请输入密码";
    passwd.style.cssText = `
        width: 100%; padding: 8px 10px;
        border: 1px solid #ddd; border-radius: 4px;
        font-size: 14px; margin-bottom: 15px;
        box-sizing: border-box;
    `;
    passTip.htmlFor = "password";
    loginBox.appendChild(passwd);

    // 按钮组
    let btnGroup = document.createElement("div");
    btnGroup.style.cssText = "display: flex; gap: 10px;";

    let btn = document.createElement("button");
    btn.innerHTML = "登录";
    btn.style.cssText = `
        flex: 1; padding: 8px;
        background: #2196F3; color: white;
        border: none; border-radius: 4px;
        cursor: pointer; font-size: 14px;
    `;
    btn.onmouseover = () => {
        if (btn.style.background !== "#4CAF50") {
            btn.style.background = "#1976D2";
        }
    };
    btn.onmouseout = () => {
        if (btn.style.background !== "#4CAF50") {
            btn.style.background = "#2196F3";
        }
    };

    let cancelBtn = document.createElement("button");
    cancelBtn.innerHTML = "取消";
    cancelBtn.style.cssText = `
        flex: 1; padding: 8px;
        background: #f44336; color: white;
        border: none; border-radius: 4px;
        cursor: pointer; font-size: 14px;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = "#da190b";
    cancelBtn.onmouseout = () => cancelBtn.style.background = "#f44336";
    cancelBtn.onclick = () => loginBox.style.display = "none";

    btnGroup.appendChild(btn);
    btnGroup.appendChild(cancelBtn);
    loginBox.appendChild(btnGroup);

    // 登录逻辑
    function handleLogin() {
        const username = user.value.trim();
        const password = passwd.value.trim();
        if (!username || !password) {
            notify("请输入用户名和密码", "warning");
            return;
        }
        // 直接调用登录事件
        loginEvent(url, loginUiElem, () => {
            // 登录成功后的回调
            clickEvent(url, tip);
        });
    }

    function handleLogout() {
        GM_setValue("username", "");
        GM_setValue("password", "");

        // 恢复蓝色
        loginBtn.innerHTML = "🔑 登录";
        loginBtn.style.background = "#2196F3";
        loginBtn.onmouseover = () => loginBtn.style.background = "#1976D2";
        loginBtn.onmouseout = () => loginBtn.style.background = "#2196F3";

        user.value = "";
        passwd.value = "";
        let elements = document.getElementsByClassName("local_pic_status");
        if (elements && elements.length > 0) {
            // 将HTMLCollection转为数组，避免动态变化问题
            const elementArray = Array.from(elements);
            for (const element of elementArray) {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }
        }
        notify("已登出", "info");

    }

    // 点击登录按钮切换弹窗
    loginBtn.onclick = () => {
        if (isLoggedIn()) {
            // 已登录则执行登出
            if (confirm("确认登出吗？")) {
                handleLogout();
            }
        } else {
            // 未登录则显示登录框
            loginBox.style.display = loginBox.style.display === "none" ? "block" : "none";
            if (loginBox.style.display === "block") {
                user.focus();
            }
        }
    };

    btn.onclick = handleLogin;

    // 回车键支持
    passwd.onkeypress = (e) => { if (e.key === "Enter") handleLogin(); };
    user.onkeypress = (e) => { if (e.key === "Enter") passwd.focus(); };

    // 点击其他地方关闭登录框
    document.addEventListener("click", (e) => {
        if (loginBox.style.display === "block" &&
            !loginBox.contains(e.target) &&
            e.target !== loginBtn) {
            loginBox.style.display = "none";
        }
    });

    // 初始状态
    if (isLoggedIn()) {
        loginBtn.innerHTML = "✅ 已登录";
        loginBtn.style.background = "#4CAF50";
        loginBtn.onmouseover = () => loginBtn.style.background = "#45a049";
        loginBtn.onmouseout = () => loginBtn.style.background = "#4CAF50";
    }

    log.appendChild(loginBtn);
    log.appendChild(loginBox);
    div.appendChild(log);

    // 保持原返回值不变
    return { userElem: user, passwordElem: passwd, buttonElem: btn, loginElem: log, loginBtn: loginBtn, loginBox: loginBox }
}

// 添加动画样式（一次性）
if (!document.getElementById("login-style")) {
    const style = document.createElement('style');
    style.id = "login-style";
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        #login > div:last-child {
            animation: slideIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}
async function login(url) {
    //空字符串
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password")))
        return await new Promise((res, rej) => rej("-1"));
    //登录
    return await new Promise((res, rej) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: url + "auth/login?username=" + GM_getValue("username"),
            headers: {
                "X-Password": GM_getValue("password")
            },
            onload: (response) => {
                if (response.status === 200) {
                    GM_setValue("auth", response.responseText);
                    res();
                } else {
                    rej(response.status);
                }
            }
        });
    });
}
function loginRes(login, loginUiElem) {
    return login.then(() => {
        // 按钮变绿色
        loginUiElem.loginBtn.innerHTML = "✅ 已登录";
        loginUiElem.loginBtn.style.background = "#4CAF50";
        loginUiElem.loginBtn.onmouseover = () => loginUiElem.loginBtn.style.background = "#45a049";
        loginUiElem.loginBtn.onmouseout = () => loginUiElem.loginBtn.style.background = "#4CAF50";

        loginUiElem.loginBox.style.display = "none";
        notify("✅ 登录成功！", "success");
    }, (rej) => {
        if (rej === 502) {
            alert("服务器异常，请稍后重试！");
            return;
        }
        if (rej === 403 || rej === 401) {
            alert("用户名或密码错误！");
            loginUiElem.loginElem.style.display = "block";
            GM_setValue("username", "");
            GM_setValue("password", "");
            GM_setValue("auth", "");
        }
        if (rej == "-1") {
            loginUiElem.loginElem.style.display = "block";
        }
    });
}
function loginEvent(url, loginUiElem, event) {
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
        GM_setValue("username", loginUiElem.userElem.value);
        GM_setValue("password", loginUiElem.passwordElem.value);
    }
    return loginRes(login(url), loginUiElem).finally(() => {
        if (typeof event === 'function')
            event()
    });
}
function createTip() {
    let tip = document.createElement("h2");
    tip.id = "tip";
    let tp = { "www.pixiv.net": "60", "danbooru.donmai.us": "5" }
    tip.style.cssText = `
        position: fixed;
        top: ${tp[window.location.host]}px;
        left: 50%;
        transform: translateX(-50%);
        margin: 0px;
        padding: 10px 24px;
        font-size: 14px;
        font-weight: normal;
        text-align: center;
        background: rgba(255,255,255,0.95);
        color: #333;
        border: 1px solid #ddd;
        border-radius: 25px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9999;
        max-width: 500px;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        pointer-events: auto;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        display: none;
    `;
    // 创建删除通知元素（与tip相同位置）
    let deleteNotify = document.createElement("div");
    deleteNotify.id = "delete-notify";
    deleteNotify.textContent = "🗑️ 提示已删除";
    deleteNotify.style.cssText = `
        position: fixed;
        top: ${tp[window.location.host]}px;
        left: 50%;
        transform: translateX(-50%);
        margin: 0px;
        padding: 10px 24px;
        font-size: 14px;
        font-weight: normal;
        text-align: center;
        background: #f44336;
        color: white;
        border: 1px solid #f44336;
        border-radius: 25px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 500px;
        backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
    `;
    document.body.appendChild(deleteNotify);
    // 长按计时器
    let pressTimer = null;
    let isLongPress = false;

    tip.addEventListener("mousedown", (e) => {
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            // 隐藏tip
            tip.style.display = "none";
            // 在相同位置显示删除通知
            deleteNotify.style.opacity = "1";
            // 1秒后淡出
            setTimeout(() => {
                deleteNotify.style.opacity = "0";
            }, 1000);
        }, 800); // 长按800ms触发
    });

    // 鼠标松开
    tip.addEventListener("mouseup", () => {
        clearTimeout(pressTimer);
        isLongPress = false;
    });

    // 鼠标离开
    tip.addEventListener("mouseleave", () => {
        clearTimeout(pressTimer);
        isLongPress = false;
    });

    document.body.appendChild(tip);

    // 返回操作对象
    return {
        element: tip,
        show: function (message, color = "#333", borderColor = "#ddd") {
            tip.textContent = message;
            tip.style.color = color;
            tip.style.borderColor = borderColor;
            tip.style.display = "block";
        },
        hide: function () {
            tip.style.display = "none";
        }
    };
}
let clickEvent = (url, tipObj) => {
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password"))) {
        tipObj.show("⚠️ 您还未登录！", "#ff9800", "#ff9800");
        return;
    }
    search(url + "tools/search").then(() => {
        if (GM_getValue("download") === 0) {
            tipObj.show("✅ 本图片尚未下载", "#4CAF50", "#4CAF50");
        }
        if (GM_getValue("download") === 1) {
            tipObj.show("❌ 本图片已下载", "#f44336", "#f44336");
        }
    }).catch(() => {
        tipObj.show("⚠️ 查询失败，请重试", "#ff9800", "#ff9800");
    });
}

// 添加动画样式
if (!document.getElementById("tip-style")) {
    const style = document.createElement('style');
    style.id = "tip-style";
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}
function infoUi(url, loginUiElem) {
    let tip = createTip();
    loginEvent(url, loginUiElem, () => clickEvent(url, tip));
    loginUiElem.buttonElem.onclick = () => {
        if (loginUiElem.userElem.value === "" || loginUiElem.passwordElem.value === "") {
            alert("输入框为空！");
            return;
        }
        loginEvent(url, loginUiElem, () => clickEvent(url, tip));
    };
    return tip;
}
async function search(url) {
    let flag = -1;
    let picId;
    if (window.location.hostname == "www.pixiv.net") {
        flag++;
        picId = window.location.href.split("/").at(-1);
    } else {
        let fullUrl = document.querySelector("#post-info-source").textContent;
        if (fullUrl.split(" ").at(1).split("/").at(0) === "pixiv.net") {//Pixiv来源
            picId = fullUrl.split(" ").at(1).split("/").at(-1).split(" ").at(0);
            await pixiv(url, picId);
            if (GM_getValue("download") === 1)
                return await new Promise((res) => { res(1) });
        }
        if (document.querySelector("#image").src.split("/")[3] === "sample")
            picId = document.querySelector("#image").src.split("-").at(-1).split(".").at(0);
        else
            picId = document.querySelector("#image").src.split("_").at(-1).split(".").at(0);
    }
    return await sendReq(url, flag, picId);
}
function sendReq(url, flag, picId) {
    return new Promise((res, rej) => {
        GM_xmlhttpRequest({
            method: "GET", url: url + "?query=" + picId + "&sources=Image",
            anonymous: true,
            cookie: "filebrowser_quantum_jwt=" + GM_getValue("auth"),
            timeout: 20000,
            onload: (response) => {
                let json = JSON.parse(response.responseText);
                if (Object.keys(json).length != 0)
                    json = json.map(function (elem) { return elem.path.split("_").at(flag).split(".").at(0).split("/").at(-1) })
                else
                    json = []
                let arr = new Set(json);
                let download = 0;
                for (let elem of arr) {
                    if (elem === picId) {
                        download = 1;
                        break;//检查id是否完全相等，有些id是另一个id的一部分
                    }
                }
                GM_setValue("download", download);
                res(download);
            },
            onerror: (error) => {
                console.error('❌id:' + picId + ' 请求失败', error);
                rej(error)
            },
            ontimeout: () => {
                console.warn('⏰id:' + picId + '请求超时');
                rej(new Error("请求超时"));
            }
        })
    })
}
function pixiv(url, pixivId) {
    return sendReq(url, 0, pixivId);
}
function danbooru(url, danbooruId) {
    return sendReq(url, -1, danbooruId);
}

async function searchList(url, href) {
    let id;
    if (window.location.hostname == "www.pixiv.net") {
        id = href.split("/").at(-1);
        return await pixiv(url, id);
    } else {
        id = href.split("/").at(-1).split(".")[0];
        return await danbooru(url, id);
    }
}
function infoList(url, loginUiElem, hostName) {
    if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password")))
        return
    const sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    const isElementLoaded = async (selector, end, siteNum) => {
        await sleep(2000)
        if (siteNum == 0) {
            while (document.querySelectorAll(selector)[end - 1] === undefined || document.querySelectorAll(selector)[end - 1].href === undefined) {
                await new Promise(res => requestAnimationFrame(res))
            }
        }
        else {
            while (document.querySelectorAll(selector)[end - 1] === undefined || document.querySelectorAll(selector)[end - 1].src === undefined) {
                await new Promise(res => requestAnimationFrame(res))
            }
        }
        return await new Promise(res => {
            res(document.querySelectorAll(selector));
        })
    };
    let listEvent = url => {
        if (noneArr.includes(GM_getValue("username")) || noneArr.includes(GM_getValue("password")))
            return;
        if (hostName === "www.pixiv.net") {
            isElementLoaded("div[class='col-span-2']>div>div:nth-of-type(2)>a", 1, 0).then(res1 => {
                for (let i = 0; i < res1.length; i++) {
                    if (!document.getElementById("status_" + i)) {
                        let status = document.createElement("div");
                        searchList(url + "tools/search", res1[i].href).then(() => {
                            if (GM_getValue("download") === 0) {
                                status.textContent = "✔️";
                            } else {
                                status.textContent = "❌️";
                            }
                            let elem = document.getElementById("status_" + i)
                            if (elem)
                                elem.remove()
                            status.id = "status_" + i;
                            status.className = "local_pic_status";
                            res1[i].parentNode.append(status);
                        });
                    }
                }
            })
        } else {
            isElementLoaded(".post-preview-image", 1, 1).then(res1 => {
                for (let i = 0; i < res1.length; i++) {
                    if (!document.getElementById("status_" + i)) {
                        let status = document.createElement("div");
                        searchList(url + "tools/search", res1[i].src).then(res2 => {
                            if (GM_getValue("download") === 0) {
                                status.textContent = "✔️";
                            } else {
                                status.textContent = "❌️";
                            }
                            let elem = document.getElementById("status_" + i)
                            if (elem)
                                elem.remove()
                            status.id = "status_" + i;
                            status.className = "local_pic_status";
                            status.style.position = "absolute";
                            status.style.backgroundColor = "white";
                            status.style.fontSize = "17.5px";
                            status.style.right = "0";
                            res1[i].parentNode.prepend(status);
                        });
                    }
                }
            });
        }
    };
    loginEvent(url, loginUiElem, () => listEvent(url));
    loginUiElem.buttonElem.onclick = () => {
        if (loginUiElem.userElem.value === "" || loginUiElem.passwordElem.value === "") {
            alert("输入框为空！");
            return;
        }
        loginEvent(url, loginUiElem, () => { listEvent(url) });
    };
}
function renewFolder(url) {
    let path = ["/mobile/Normal", "/mobile/R-18", "/pc/Normal", "/pc/R-18"]
    for (let i = 0; i < path.length; i++)
        GM_xmlhttpRequest({
            url: url + "/resources?path=" + path[i] + "&source=Image",
            method: "GET",
            cookie: "filebrowser_quantum_jwt=" + GM_getValue("auth")
        });
}
(function () {
    'use strict';
    GM_setValue("auth", "");
    let div = document.createElement("div");
    let path = window.location.pathname;
    div.style.backgroundColor = "white";
    div.id = "infoDisplay";
    let loginUiElem = loginUi(div);
    renewFolder(url);
    document.body.prepend(div);
    let regexDanbooru = /posts/;
    let regexPixiv = /(tags|artworks)/;
    let tip = null
    if (regexDanbooru.test(path) || regexPixiv.test(path)) {
        regexDanbooru = /posts\//;
        regexPixiv = /artworks/;
        if (regexDanbooru.test(path) || regexPixiv.test(path))
            tip = infoUi(url, loginUiElem);
        else
            infoList(url, loginUiElem, window.location.host);
    }
    history.pushState = _wr('pushState');
    window.addEventListener('pushState', function () {
        console.warn("href changed to " + window.location.href)
        renewFolder(url);
        if (tip != null) {
            tip.element.replaceWith(tip.element.cloneNode(true));
            tip.element.remove()
            tip = null
        }
        let path = window.location.pathname
        let regexDanbooru = /posts/;
        let regexPixiv = /(tags|artworks)/;
        if (regexDanbooru.test(path) || regexPixiv.test(path)) {
            regexDanbooru = /posts\//;
            regexPixiv = /artworks/;
            if (regexDanbooru.test(path) || regexPixiv.test(path))
                tip = infoUi(url, loginUiElem);
            else
                infoList(url, loginUiElem, window.location.host);
        }
    }
    )
    window.addEventListener('popstate', function () {
        console.warn("href changed to " + window.location.href)
        renewFolder(url);
        if (tip != null) {
            tip.element.remove()
            tip.element.replaceWith(tip.element.cloneNode(true));
            tip = null
        }
        let path = window.location.pathname
        let regexDanbooru = /posts/;
        let regexPixiv = /(tags|artworks)/;
        if (regexDanbooru.test(path) || regexPixiv.test(path)) {
            regexDanbooru = /posts\//;
            regexPixiv = /artworks/;
            if (regexDanbooru.test(path) || regexPixiv.test(path))
                tip = infoUi(url, loginUiElem);
            else
                infoList(url, loginUiElem, window.location.host);
        }
    })
})();

