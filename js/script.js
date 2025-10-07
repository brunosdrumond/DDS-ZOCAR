// --- CONFIGURAÇÕES GLOBAIS ---
const SHEETDB_URL = "https://sheetdb.io/api/v1/ddk7y1rz26oup";
const STORAGE_KEY = 'humor_registros_v1';
const ADMIN_PASS = '1234'; // Senha do Admin

// --- REFERÊNCIAS DO DOM ---
const formHumor = document.getElementById("formHumor");
const tabelaBody = document.querySelector("#tabela tbody");
const msgElement = document.getElementById("msg");

// Referências Admin (Retiradas do seu código antigo)
const senhaInput = document.getElementById('senhaAdmin');
const btnLoginAdmin = document.getElementById('btnLoginAdmin');
const btnLogoutAdmin = document.getElementById('btnLogoutAdmin');
const btnImprimir = document.getElementById('btnImprimir');
const btnExport = document.getElementById('btnExport');
const btnClear = document.getElementById('btnClear');
const filtroLocal = document.getElementById('filtroLocal');
const adminColumns = document.querySelectorAll('.admin-only'); // Não usada diretamente, mas pode ser útil

// 📝 Variável para armazenar os registros localmente
let registros = [];

// --- FUNÇÕES UTILITÁRIAS ---

function isAdmin(){ return sessionStorage.getItem('isAdmin') === '1'; }
function loadRecords(){
    try{ registros = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e){ registros = []; }
}
function saveRecords(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); }

function showMessage(text, isError=false){
    msgElement.textContent = text;
    msgElement.style.color = isError ? '#b00020' : 'green';
    setTimeout(()=> { if (msgElement.textContent === text) msgElement.textContent = ''; }, 2500);
}

function formatDate(iso){ 
    try{ 
        // Adaptação para formatar a data da tabela (apenas últimos 5 registros)
        return new Date(iso).toLocaleDateString('pt-BR', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
        });
    }catch(e){ 
        return iso || '';
    } 
}

// --- LÓGICA DE ADMIN UI ---

// Função para aplicar/remover a interface de Admin
function applyAdminUI(isOn){
    // Exibe/Oculta botões e filtros
    [btnImprimir, btnExport, btnClear, btnLogoutAdmin, filtroLocal].forEach(el => el.classList[isOn ? 'remove' : 'add']('hidden'));
    [btnLoginAdmin, senhaInput].forEach(el => el.classList[isOn ? 'add' : 'remove']('hidden'));
    
    // Mostra/Oculta a coluna de Ações na tabela
    document.querySelectorAll('.admin-only').forEach(el => el.classList[isOn ? 'remove' : 'add']('hidden'));
    
    renderizarTabela(); // Redesenha a tabela para aplicar a visibilidade das ações
}


// --- FUNÇÃO DE RENDERIZAÇÃO DE TABELA (ADAPTADA) ---

function renderizarTabela() {
    tabelaBody.innerHTML = '';
    
    const filtro = filtroLocal.value || 'Todos';
    const registrosFiltrados = filtro === 'Todos' 
        ? registros 
        : registros.filter(r => r.local === filtro);

    // Mostra todos os registros se for Admin, ou os últimos 5 se for usuário normal
    const registrosAMostrar = isAdmin() ? registrosFiltrados.reverse() : registrosFiltrados.slice(-5).reverse();

    if (registrosAMostrar.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="${isAdmin() ? 5 : 4}">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    registrosAMostrar.forEach((r, idx) => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${r.nome || ''}</td>
            <td>${r.local || ''}</td>
            <td>${r.humor || ''}</td>
            <td>${formatDate(r.criadoEm || '')}</td>
            <td class="admin-only ${isAdmin()?'':'hidden'}">
                ${isAdmin() ? '<button class="small danger">Apagar</button>' : ''}
            </td>
        `;
        
        // Lógica para apagar registro (apenas se for Admin)
        if (isAdmin()){
            tr.querySelector('button').onclick = ()=> {
                if (confirm('Tem certeza que deseja apagar este registro localmente? (Isto não remove do Google Sheets!)')){
                    // Encontra o índice no array 'registros' original (mais seguro que usar o 'idx' do forEach filtrado)
                    const originalIndex = registros.findIndex(reg => reg.criadoEm === r.criadoEm && reg.nome === r.nome);
                    if (originalIndex > -1) {
                        registros.splice(originalIndex, 1); 
                        saveRecords(); 
                        renderizarTabela(); 
                        showMessage('Registro local apagado');
                    }
                }
            };
        }

        tabelaBody.appendChild(tr);
    });
}


// --- LÓGICA DE ENVIO PARA GOOGLE SHEETS (SHEETDB) E FORMULÁRIO ---

// 🎯 Evento de envio do formulário (com envio SheetDB)
formHumor.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const local = document.getElementById("local").value.trim();
    const humorEl = document.querySelector('input[name="humor"]:checked');

    if (!nome || !local || !humorEl) {
        showMessage('Preencha todos os campos.', true);
        return;
    }

    const humor = humorEl.value;
    const criadoEm = new Date().toISOString();
    
    // 1. Salva o registro localmente (para exibição rápida)
    const registro = { nome, local, humor, criadoEm };
    registros.push(registro);
    saveRecords();
    renderizarTabela();

    // 2. Prepara o botão para o envio
    const botaoSubmit = formHumor.querySelector('button[type="submit"]');
    const textoOriginalBotao = botaoSubmit.textContent;
    botaoSubmit.textContent = "Enviando...";
    botaoSubmit.disabled = true;
    msgElement.textContent = "";

    // 3. Envia os dados para o SheetDB/Google Sheets
    try {
        const dadosParaPlanilha = {
            "Nome Completo": nome, 
            "Local de Trabalho": local,
            "Humor": humor, 
            "Data/Hora": new Date().toLocaleString('pt-BR')
        };

        const resposta = await fetch(SHEETDB_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: [dadosParaPlanilha] })
        });

        if (resposta.ok) {
            showMessage("✅ Salvo no no Google Sheets!", false);
            formHumor.reset(); // Limpa o formulário apenas após o sucesso
            document.querySelectorAll('.emoji-label').forEach(l=>l.classList.remove('selected'));
        } else {
            console.error("Erro no SheetDB:", await resposta.text());
            showMessage("⚠️ Erro ao salvar na planilha. Salvo localmente.", true);
        }
    } catch (err) {
        console.error("Falha de conexão:", err);
        showMessage("❌ Falha de conexão. Salvo localmente.", true);
    } finally {
        // 4. Restaura o botão após a operação
        setTimeout(() => {
            botaoSubmit.textContent = textoOriginalBotao;
            botaoSubmit.disabled = false;
        }, 2000);
    }
});


// --- EVENTOS DO MODO ADMIN ---

// Login
btnLoginAdmin.onclick = ()=>{
    if (senhaInput.value === ADMIN_PASS){
        sessionStorage.setItem('isAdmin','1');
        applyAdminUI(true); 
        showMessage('Modo administrador ativado.'); 
        senhaInput.value='';
    } else {
        showMessage('Senha incorreta.', true);
    }
};

// Logout
btnLogoutAdmin.onclick = ()=>{ 
    sessionStorage.removeItem('isAdmin'); 
    applyAdminUI(false); 
    showMessage('Deslogado do modo administrador.'); 
};

// Filtro por Local
filtroLocal.addEventListener('change', renderizarTabela);

// Limpar todos
btnClear.onclick = ()=>{
    if (confirm('TEM CERTEZA QUE DESEJA APAGAR TODOS OS REGISTROS LOCAIS? (Isto não remove do Google Sheets!)')){
        registros = [];
        saveRecords();
        renderizarTabela();
        showMessage('Todos os registros locais apagados.');
    }
}

// Impressão (Mantido do código antigo)
btnImprimir.onclick = ()=>{
    const filtro = filtroLocal.value;
    const lista = filtro==='Todos' ? registros : registros.filter(r=>r.local===filtro);
    if (!lista.length){ showMessage('Nenhum registro para este local.', true); return; }
    const newWin = window.open('', '_blank', 'width=900,height=700');
    let rows = lista.map(r=>`<tr><td>${r.nome}</td><td>${r.local}</td><td>${r.humor}</td><td>${formatDate(r.criadoEm)}</td></tr>`).join('');
    newWin.document.write(`
      <html><head><title>Relatório de Humor</title></head><body>
      <h2 style="text-align:center">Relatório de Humor - ${filtro}</h2>
      <table border="1" style="width:100%;border-collapse:collapse;text-align:center">
        <tr><th>Nome</th><th>Local</th><th>Humor</th><th>Data</th></tr>
        ${rows}
      </table>
      </body></html>
    `);
    newWin.document.close(); 
    // newWin.print(); // Descomente para que a janela de impressão abra automaticamente
};


// --- LÓGICA EXTRA (SELEÇÃO DE EMOJI) ---

// Destaca visualmente o emoji selecionado
document.querySelectorAll('input[name="humor"]').forEach(input => {
    input.addEventListener('change', function() {
        document.querySelectorAll('.emoji-label').forEach(label => {
            label.classList.remove('selected');
        });
        if (this.checked) {
            this.closest('.emoji-label').classList.add('selected');
        }
    });
});


// --- INICIALIZAÇÃO ---
loadRecords(); 
renderizarTabela(); 
applyAdminUI(isAdmin()); // Verifica se já está logado no início