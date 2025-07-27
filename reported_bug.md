1. PDF 다운로드 버튼 누르면 에러 발생
---
    Uncaught runtime errors:
×
ERROR
Cannot read properties of undefined (reading 'Unicode')
TypeError: Cannot read properties of undefined (reading 'Unicode')
    at __webpack_modules__../node_modules/jspdf/dist/jspdf.es.min.js.Vt.getCharWidthsArray (http://localhost:3000/static/js/bundle.js:22214:42)
    at Object.Xt (http://localhost:3000/static/js/bundle.js:22254:12)
    at __webpack_modules__../node_modules/jspdf/dist/jspdf.es.min.js.Vt.splitTextToSize (http://localhost:3000/static/js/bundle.js:22309:57)
    at handleDownloadPdf (http://localhost:3000/static/js/bundle.js:88481:23)
    at onClick (http://localhost:3000/static/js/bundle.js:88706:26)
    at executeDispatch (http://localhost:3000/static/js/bundle.js:70805:7)
    at runWithFiberInDEV (http://localhost:3000/static/js/bundle.js:63547:68)
    at processDispatchQueue (http://localhost:3000/static/js/bundle.js:70833:31)
    at http://localhost:3000/static/js/bundle.js:71126:7
    at batchedUpdates$1 (http://localhost:3000/static/js/bundle.js:64396:38)
---

2. 채팅 전송 후 답변 돌아올 때 까지 전송한 메세지가 입력 창에 남아있음

3. 로그가 백엔드 서버에서 출력되는 모든 메세지를 보여줘야하는데 일부만 나옴.

4. 변형된 문제가 마크다운 형식으로 잘 나왔었는데 어느 순간 "정말 감사합니다! 이렇게 다양한 유형으로 변형해주시다니, 제 실력 향상에 큰 도움이 될 것 같아요. 혹시 다른 지문으로도 문제 변형을 요청할 수 있을까요?" 등의 의미없는 대답이 출력됨. 이는 3번의 문제를 해결하면 원인 파악이 가능할 것으로 생각됨.