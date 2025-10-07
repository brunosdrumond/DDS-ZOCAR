(function(){
  const STORAGE_KEY = 'humor_registros_v1';
  const ADMIN_PASS = '1234'; 

  const form = document.getElementById('formHumor');
  const tabelaBody = document.querySelector('#tabela tbody');
  const msg = document.getElementById('msg');
  const senhaInput = document.getElementById('senhaAdmin');
  const btnLoginAdmin = document.getElementById('btnLoginAdmin');
  const btnLogoutAdmin = document.getElementById('btnLogoutAdmin');
  const btnImprimir = document.getElementById('btnImprimir');
  const btnExport = document.getElementById('btnExport');
  const btnClear = document.getElementById('btnClear');
  const filtroLocal = document.getElementById('filtroLocal');
  const adminColumns = document.querySelectorAll('.admin-only');

  let registros = [];

  function loadRecords(){
    try{ registros = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e){ registros = []; }
  }

  function saveRecords(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); }

  function showMessage(text, isError=false){
    msg.textContent = text;
    msg.style.color = isError? '#b00020' : 'green';
    setTimeout(()=> { if (msg.textContent === text) msg.textContent = ''; }, 2500);
  }

  function formatDate(iso){ try{ return new Date(iso).toLocaleString('pt-BR'); }catch(e){ return iso||'';} }

  function renderTable(){
    tabelaBody.innerHTML = '';
    registros.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.nome||''}</td>
        <td>${r.local||''}</td>
        <td>${r.humor||''}</td>
        <td>${formatDate(r.criadoEm||'')}</td>
        <td class="admin-only ${isAdmin()?'':'hidden'}">
          ${isAdmin()?'<button class="small danger">Apagar</button>':''}
        </td>`;
      if (isAdmin()){
        tr.querySelector('button').onclick = ()=> {
          if (confirm('Apagar este registro?')){
            registros.splice(idx,1); saveRecords(); renderTable(); showMessage('Registro apagado');
          }
        };
      }
      tabelaBody.appendChild(tr);
    });
  }

  function isAdmin(){ return sessionStorage.getItem('isAdmin') === '1'; }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const local = document.getElementById('local').value;
    const humorEl = document.querySelector('input[name="humor"]:checked');
    if (!nome || !local || !humorEl){ showMessage('Preencha todos os campos.', true); return; }
    registros.push({nome, local, humor: humorEl.value, criadoEm:new Date().toISOString()});
    saveRecords(); renderTable(); showMessage('Registro salvo com sucesso.');
    form.reset(); document.querySelectorAll('.emoji-label').forEach(l=>l.classList.remove('selected'));
  });

  btnLoginAdmin.onclick = ()=>{
    if (senhaInput.value === ADMIN_PASS){
      sessionStorage.setItem('isAdmin','1');
      applyAdminUI(true); showMessage('Modo administrador ativado.'); senhaInput.value='';
    } else showMessage('Senha incorreta.', true);
  };

  btnLogoutAdmin.onclick = ()=>{ sessionStorage.removeItem('isAdmin'); applyAdminUI(false); showMessage('Deslogado do modo administrador.'); };

  function applyAdminUI(isOn){
    [btnImprimir,btnExport,btnClear,btnLogoutAdmin,filtroLocal].forEach(el=> el.classList[isOn?'remove':'add']('hidden'));
    [btnLoginAdmin,senhaInput].forEach(el=> el.classList[isOn?'add':'remove']('hidden'));
    renderTable();
  }
  btnImprimir.onclick = ()=>{
    const filtro = filtroLocal.value;
    const lista = filtro==='Todos' ? registros : registros.filter(r=>r.local===filtro);
    if (!lista.length){ showMessage('Nenhum registro para este local.', true); return; }
    const newWin = window.open('', '_blank', 'width=900,height=700');
    let rows = lista.map(r=>`<tr><td>${r.nome}</td><td>${r.local}</td><td>${r.humor}</td><td>${formatDate(r.criadoEm)}</td></tr>`).join('');
    newWin.document.write(`
      <html><head><title>Relatório</title></head><body>
      <h2 style="text-align:center">Relatório de Humor - ${filtro}</h2>
      <table border="1" style="width:100%;border-collapse:collapse;text-align:center">
        <tr><th>Nome</th><th>Local</th><th>Humor</th><th>Data</th></tr>
        ${rows}
      </table>
      </body></html>
    `);
    newWin.document.close(); newWin.print();
  };

  loadRecords(); renderTable(); applyAdminUI(isAdmin());
})();
