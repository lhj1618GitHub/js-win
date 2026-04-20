// ==UserScript==
// @name        网页工具箱
// @namespace   解除右键复制限制/修改内容/元素隐藏元素移动
// @match       *://*/*
// @grant       GM_registerMenuCommand
// @version     10.1
// @author      lhj1618
// @description 解除右键复制限制/修改内容/元素隐藏元素移动
// ==/UserScript==

(function() {
    let panelVisible = false;
    let panel = null;

    // ====================== 功能1：解除右键复制限制 ======================
    function removeAllLimits() {
        function e(e) {e.stopPropagation();e.stopImmediatePropagation&&e.stopImmediatePropagation();}
        document.querySelectorAll('*').forEach(function(t){
            'none'===window.getComputedStyle(t,null).getPropertyValue('user-select')&&t.style.setProperty('user-select','text','important');
        });
        ['copy','cut','contextmenu','selectstart','mousedown','mouseup','mousemove','keydown','keypress','keyup'].forEach(function(t){
            document.documentElement.addEventListener(t,e,{capture:true});
        });
        showTip('已解除网页限制！');
    }


    // ====================== 功能2：网页修改内容 ======================
    function startEditPage() {
        document.body.setAttribute('contenteditable','true');
        document.addEventListener('keydown',function(e){
            e=e||window.event;if(e.keyCode==27){document.body.setAttribute('contenteditable','false');}
        });
        var previousAlert=document.getElementById('clipboard-alert');
        if(previousAlert){clearTimeout(previousAlert.timeoutId);previousAlert.remove();}
        var tempAlert=document.createElement('div');tempAlert.id='clipboard-alert';tempAlert.textContent='已开启网页编辑，按 Esc 取消！';
        var alertStyles={'min-width':'150px','margin-left':'-75px','background-color':'#3B7CF1','color':'white','text-align':'center','border-radius':'4px','padding':'14px','position':'fixed','z-index':'9999999','left':'50%','top':'30px','font-size':'16px','font-family':'sans-serif'};
        for(var style in alertStyles){tempAlert.style.setProperty(style,alertStyles[style]);}
        document.body.appendChild(tempAlert);
        tempAlert.timeoutId=setTimeout(function(){tempAlert.remove();},3000);
    }


    // ====================== 功能3：网页元素隐藏 ======================
    function startElementZap() {
        var isIe=false;/*@cc_on isIe=true;@*/
        function fe(a,fn){var i,l=a.length;for(i=0;i<l;i++){fn(a[i])}}
        function ae(el,n,fn,ix){
            function wfn(ev){var el=(isIe?window.event.srcElement:ev.target);if(ix||!el.xmt)fn(el)}
            if(isIe){n='on'+n;el.attachEvent(n,wfn)}else{el.addEventListener(n,wfn,false)}
            if(!el.es)el.es=[];el.es.push(function(){if(isIe){el.detachEvent(n,wfn)}else{el.removeEventListener(n,wfn,false)}});el.re=function(){fe(el.es,function(f){f()})};
        }
        function sce(el){
            var oldclick=el.onclick,oldmu=el.onmouseup,oldmd=el.onmousedown;el.onclick=function(){return false};el.onmouseup=function(){return false};el.onmousedown=function(){return false};el.rce=function(){el.onclick=oldclick;el.onmouseup=oldmu;el.onmousedown=oldmd}
        }
        if(!window.r_)window.r_=[];var r=window.r_;var D=document;
        var styleEl=document.createElement('style');styleEl.textContent=`.element-zapper-hover{outline:2px dashed #2464F5!important;box-shadow:0 0 0 1px white!important;outline-offset:-1px!important;}`;document.head.appendChild(styleEl);
        var currentElement=null;var enableMouseNav=true;
        var selectElement=function(el){
            if(!el||el.xmt||el.closest&&el.closest('.element-zapper-toolbar'))return false;if(currentElement)currentElement.classList.remove('element-zapper-hover');currentElement=el;currentElement.classList.add('element-zapper-hover');return true
        };
        var hideElement=function(el){
            if(!el||el.xmt||el.closest&&el.closest('.element-zapper-toolbar'))return;el.style.display='none';r.push(el);currentElement=null
        };
        var exitTool=function(){
            document.querySelectorAll('[style*="background-color"]').forEach(el=>el.style.backgroundColor='');D.body.re();bx.parentNode.removeChild(bx);styleEl.remove();currentElement&&currentElement.classList.remove('element-zapper-hover');document.removeEventListener('keydown',handleKeyDown,true)
        };
        var handleKeyDown=function(e){
            if('q'===e.key.toLowerCase()||e.key==='Escape'){exitTool();e.preventDefault();e.stopPropagation();return}if(!currentElement)return;var nextElement=null;
            switch(e.key.toLowerCase()){
                case'enter':hideElement(currentElement);e.preventDefault();e.stopPropagation();break;case'arrowup':nextElement=currentElement.parentElement;break;case'arrowdown':var children=Array.from(currentElement.children).filter(e=>e.nodeType===Node.ELEMENT_NODE);nextElement=children[0];break;case'arrowleft':nextElement=currentElement.previousElementSibling;break;case'arrowright':nextElement=currentElement.nextElementSibling
            }
            if(nextElement){e.preventDefault();e.stopPropagation();selectElement(nextElement)}
        };
        document.addEventListener('keydown',handleKeyDown,true);
        ae(D.body,'mouseover',function(el){
            if(enableMouseNav&&!el.xmt&&(!el.closest||!el.closest('.element-zapper-toolbar'))){selectElement(el);el.style.backgroundColor='#DEEFFD';sce(el)}
        });
        ae(D.body,'mouseout',function(el){
            if(enableMouseNav&&el===currentElement&&!el.xmt){el.classList.remove('element-zapper-hover');currentElement=null}el.style.backgroundColor='';if(el.rce)el.rce()
        });
        ae(D.body,'click',function(el){hideElement(el)});
        function ac(p,tn,ih){var e=D.createElement(tn);if(ih)e.textContent=ih;p.appendChild(e);return e}
        var p=0;var bx=ac(D.body,'div');bx.className='element-zapper-toolbar';
        bx.style.cssText='position:'+(isIe?'absolute':'fixed')+';padding:8px 20px;background-color:#3F7FEA;border:1px solid #2960C6;z-index:9999;font-family:sans-serif;font-size:14px;top:10px;left:50%;transform:translateX(-50%);border-radius:4px;color:white';
        function sp(){bx.style.top=p?'':'30px';bx.style.bottom=p?'10px':'';bx.style.left='50%';bx.style.transform='translateX(-50%)'}
        sp();var ul=ac(bx,'a','撤销');
        ae(ul,'click',function(){var e=r.pop();if(e)e.style.display=''},true);
        ac(bx,'span','   |   ');var ual=ac(bx,'a','全部撤销');
        ae(ual,'click',function(){var e;while(e=r.pop())e.style.display=''},true);
        ac(bx,'span','   |   ');var ml=ac(bx,'a','移动');
        ae(ml,'click',function(){p=p?0:1;sp()},true);
        ac(bx,'span','   |   ');var xl=ac(bx,'a','退出');
        ae(xl,'click',exitTool,true);
        fe([bx,ul,ml,xl,ual],function(e){e.style.cursor='pointer';e.style.color='white';e.style.textDecoration='none';e.xmt=1})
        showTip('点击隐藏目标，ESC退出');
    }

    // ====================== 功能4：网页元素移动 ======================
    function startElementMove() {
        var b=X=Y=T=L=0;
        document.addEventListener("click",function(a){a.preventDefault()},!0);
        document.addEventListener("mousedown",c);document.addEventListener("touchstart",c);
        function c(a){
            a.preventDefault();a.target!==document.documentElement&&a.target!==document.body&&(b=Date.now(),a.target.setAttribute("data-drag",b),a.target.style.position="relative",T=a.target.style.top.split("px")[0]||0,L=a.target.style.left.split("px")[0]||0);X=a.clientX||a.touches[0].clientX;Y=a.clientY||a.touches[0].clientY
        }
        document.addEventListener("mousemove",d);document.addEventListener("touchmove",d);
        function d(a){
            if(""!==b){var e=document.querySelector('[data-drag="'+b+'"]');e&&(e.style.top=parseInt(T)+parseInt((a.clientY||a.touches[0].clientY)-Y)+"px",e.style.left=parseInt(L)+parseInt((a.clientX||a.touches[0].clientX)-X)+"px")}
        }
        document.addEventListener("mouseup",f);document.addEventListener("touchend",f);
        function f(){b=""}
        document.addEventListener("mouseover",g);
        function g(a){
            a.target!==document.documentElement&&a.target!==document.body&&(a.target.style.cursor="move",a.target.style.boxShadow="inset lime 0 0 1px,lime 0 0 1px")
        }
        function h(a){a.target.style.cursor="";a.target.style.boxShadow=""}
        var lastSelected=null;
        document.addEventListener("mousedown",function(a){
            if(a.target!==document.documentElement&&a.target!==document.body){lastSelected=a.target}
        });
        document.addEventListener("keydown",function(e){
            if((e.key==="Backspace"||e.key==="Delete")&&lastSelected){e.preventDefault();lastSelected.remove();lastSelected=null;b=""}else if(e.key==="Escape"){e.preventDefault();completelyExitEditMode();}
        });
        function completelyExitEditMode(){
            b="";lastSelected=null;var elements=document.querySelectorAll('[data-drag]');elements.forEach(function(el){el.removeAttribute('data-drag');el.style.boxShadow="";});var allElements=document.querySelectorAll('*');allElements.forEach(function(el){if(el!==document.documentElement&&el!==document.body){el.style.cursor="";el.style.boxShadow="";}});
            document.removeEventListener("click",function(a){a.preventDefault()},!0);document.removeEventListener("mousedown",c);document.removeEventListener("touchstart",c);document.removeEventListener("mousemove",d);document.removeEventListener("touchmove",d);document.removeEventListener("mouseup",f);document.removeEventListener("touchend",f);document.removeEventListener("mouseover",g);document.removeEventListener("mouseout",h);
        }
        showTip('拖拽移动目标，ESC退出');
    }


    // ====================== 创建悬浮面板（固定屏幕右上角，不滚动） ======================
    function createPanel() {
        if(panel) return;

        panel = document.createElement('div');
        // 核心修复：固定在屏幕右上角
        panel.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: #000;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 12px;
            z-index: 999999999 !important;
            display: none;
            width: 160px;
            pointer-events: auto !important;
        `;

        // 关闭按钮
        const closeBtn = document.createElement('div');
        closeBtn.innerText = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 0px;
            right: 0px;
            width: 18px;
            height: 18px;
            line-height: 18px;
            text-align: center;
            font-size: 16px;
            color: #fff;
            cursor: pointer;
            border-radius: 50%;
        `;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            panel.style.display = 'none';
            panelVisible = false;
            showTip('面板已隐藏');
        };
        panel.appendChild(closeBtn);

        const btnStyle = `
            display: block;
            width: 100%;
            padding: 8px 0;
            margin: 6px 0;
            border: none;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            text-align: center;
            pointer-events: auto !important;
        `;

        const btn1 = document.createElement('button');
        btn1.textContent = '🔓 解除复制限制';
        btn1.style.cssText = btnStyle + 'background:#3B7CF1;';
        btn1.onclick = (e)=>{e.stopPropagation();removeAllLimits();}

        const btn2 = document.createElement('button');
        btn2.textContent = '✏️ 网页修改内容';
        btn2.style.cssText = btnStyle + 'background:#933FF1;';
        btn2.onclick = (e)=>{e.stopPropagation();startEditPage();}

        const btn3 = document.createElement('button');
        btn3.textContent = '🧹 网页元素隐藏';
        btn3.style.cssText = btnStyle + 'background:#FF6B6B;';
        btn3.onclick = (e)=>{e.stopPropagation();startElementZap();}

        const btn4 = document.createElement('button');
        btn4.textContent = '🖱️ 网页元素移动';
        btn4.style.cssText = btnStyle + 'background:#20C997;';
        btn4.onclick = (e)=>{e.stopPropagation();startElementMove();}


        panel.appendChild(btn1);
        panel.appendChild(btn2);
        panel.appendChild(btn3);
        panel.appendChild(btn4);
        document.body.appendChild(panel);
    }

    // ====================== 切换显示/隐藏面板 ======================
    function togglePanel() {
        createPanel();
        panelVisible = !panelVisible;
        panel.style.display = panelVisible ? 'block' : 'none';
        showTip(panelVisible ? '面板已显示' : '面板已隐藏');
    }

    // ====================== 注册菜单 ======================
    window.addEventListener('load', () => {
        createPanel();
        GM_registerMenuCommand('📦 显示/隐藏面板', togglePanel);
    });
})();