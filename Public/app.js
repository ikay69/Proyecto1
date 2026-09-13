/* =========================================================
   CONFIGURACIÓN Y RUTAS DEL BACKEND
========================================================= */
const API_BASE_URL = "http://localhost:3000";

const MODULES = {
    empresas: {
        title: "Empresas",
        description: "Administración de empresas del sistema",
        endpoint: "/api/empresa/listarempresas",
        crear: "/api/empresa/ajvd845mda93n23lm3x", // Ruta de creación con hash integrado
        actualizar: "/api/empresa/updateempresa",
        campos: [
            { name: "idEmpresa", label: "ID Empresa (Solo para Editar)", type: "number", editOnly: true },
            { name: "passEmpresa", label: "Contraseña de la Empresa", type: "password", required: true },
            { name: "Nombre", label: "Nombre de la Empresa", type: "text", required: true, max: 150 },
            { name: "TipoDocumento", label: "Tipo Documento", type: "text", max: 50 },
            { name: "NumeroDocumento", label: "Número Documento", type: "text", max: 50 },
            { name: "Celular", label: "Celular (10 dígitos)", type: "text", max: 10 },
            { name: "Telefono", label: "Teléfono", type: "text", max: 25 },
            { name: "Email", label: "Email Corporativo", type: "email", max: 150 },
            { name: "Direccion", label: "Dirección Física", type: "textarea", max: 200 }
        ]
    },
    usuarios: {
        title: "Usuarios",
        description: "Gestión de cuentas de usuarios y roles",
        endpoint: "/api/usuario/getuserall",
        crear: "/api/usuario/newusuer",
        actualizar: "/api/usuario/updateuser",
        campos: [
            { name: "idUsuario", label: "ID Usuario (Solo para Editar)", type: "number", editOnly: true },
            { name: "nombres", label: "Nombres", type: "text", required: true, max: 150 },
            { name: "apellidos", label: "Apellidos", type: "text", required: true, max: 150 },
            { name: "user", label: "Nombre de Usuario (Sin espacios/acentos)", type: "text", required: true, max: 50 },
            { name: "password", label: "Contraseña (Alfanumérica sin espacios)", type: "password", required: true, max: 10 },
            { name: "rol", label: "Rol de Usuario", type: "select", options: ["ADMINISTRADOR", "VENDEDOR"], required: true }
        ]
    },
    unidadMedidas: {
        title: "Unidades de Medida",
        description: "Administración de magnitudes métricas",
        endpoint: "/api/unidadMedida/getunidadesmedida",
        crear: "/api/unidadMedida/newunidadmedida",
        actualizar: "/api/unidadMedida/updateunidadmedida",
        campos: [
            { name: "idEmpresa", label: "ID Empresa", type: "number", required: true },
            { name: "idUnidadMedida", label: "ID Unidad (Solo para Editar)", type: "number", editOnly: true },
            { name: "Nombre", label: "Nombre (Se guardará en MAYÚSCULAS)", type: "text", required: true, max: 50 },
            { name: "Simbolo", label: "Símbolo", type: "text", required: true, max: 10 },
            { name: "Estado", label: "Activo", type: "select", options: ["true", "false"], editOnly: true }
        ]
    },
    tipodocumento: {
        title: "Tipos de Documento",
        description: "Gestión de documentos de identidad permitidos",
        endpoint: "/api/tipodocumento/getalltipodocumento",
        crear: "/api/tipodocumento/newtipodocumento",
        actualizar: "/api/tipodocumento/updatetipodocumento",
        campos: [
            { name: "idEmpresa", label: "ID Empresa", type: "number", required: true },
            { name: "idTipoDocumento", label: "ID Tipo Doc (Solo para Editar)", type: "number", editOnly: true },
            { name: "Abreviatura", label: "Abreviatura (ej: CC)", type: "text", required: true, max: 10 },
            { name: "Descripcion", label: "Descripción Completa", type: "text", required: true, max: 100 },
            { name: "Estado", label: "Activo", type: "select", options: ["true", "false"], editOnly: true }
        ]
    },
    categorias: {
        title: "Categorías",
        description: "Clasificación de productos del inventario",
        endpoint: "/api/categoria/getallcategoria",
        crear: "/api/categoria/newcategoria",
        actualizar: "/api/categoria/updatecategoria",
        campos: [
            { name: "idEmpresa", label: "ID Empresa", type: "number", required: true },
            { name: "idCategoria", label: "ID Categoría (Solo para Editar)", type: "number", editOnly: true },
            { name: "Nombre", label: "Nombre de Categoría", type: "text", required: true, max: 50 },
            { name: "Estado", label: "Activo", type: "select", options: ["true", "false"], editOnly: true }
        ]
    },
    terceros: {
        title: "Terceros",
        description: "Administración de clientes y proveedores",
        endpoint: "/api/tercero/getalltercero",
        crear: "/api/tercero/newtercero",
        actualizar: "/api/tercero/getalltercero", // Ruta compartida según especificación técnica
        campos: [
            { name: "idEmpresa", label: "ID Empresa", type: "number", required: true },
            { name: "idTercero", label: "ID Tercero (Solo para Editar)", type: "number", editOnly: true },
            { name: "Nombre", label: "Nombre / Razón Social", type: "text", required: true, max: 150 },
            { name: "Apellidos", label: "Apellidos", type: "text", required: true, max: 150 },
            { name: "idTipoDocumento", label: "ID Tipo Documento", type: "number", required: true },
            { name: "NumeroDocumento", label: "Número de Documento", type: "text", required: true, max: 50 },
            { name: "Celular", label: "Celular (Exactamente 10 caracteres)", type: "text", max: 10 },
            { name: "Email", label: "Correo Electrónico", type: "email", max: 150 },
            { name: "Direccion", label: "Dirección", type: "text", max: 20 },
            { name: "Estado", label: "Activo", type: "select", options: ["true", "false"], editOnly: true }
        ]
    }
};

/* =========================================================
   ESTADO GLOBAL DEL CLIENTE
========================================================= */
const state = {
    token: null,
    usuario: null,
    empresa: null,
    rol: null,
    currentModule: null,
    currentPage: 1,
    records: [],
    editingRecord: null
};

/* =========================================================
   ELEMENTOS DEL DOM
========================================================= */
const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const companyName = document.getElementById("companyName");
const sidebarUserName = document.getElementById("sidebarUserName");
const userInitial = document.getElementById("userInitial");
const userRole = document.getElementById("userRole");
const logoutButton = document.getElementById("logoutButton");
const welcomeView = document.getElementById("welcomeView");
const moduleView = document.getElementById("moduleView");
const moduleTitle = document.getElementById("moduleTitle");
const moduleDescription = document.getElementById("moduleDescription");
const addButton = document.getElementById("addButton");
const filterText = document.getElementById("filterText");
const pageSize = document.getElementById("pageSize");
const orderField = document.getElementById("orderField");
const orderDirection = document.getElementById("orderDirection");
const searchButton = document.getElementById("searchButton");
const moduleMessage = document.getElementById("moduleMessage");
const dataTableHead = document.getElementById("dataTableHead");
const dataTableBody = document.getElementById("dataTableBody");
const emptyTable = document.getElementById("emptyTable");
const previousPage = document.getElementById("previousPage");
const nextPage = document.getElementById("nextPage");
const pageInformation = document.getElementById("pageInformation");
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalFields = document.getElementById("modalFields");
const recordForm = document.getElementById("recordForm");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");

/* =========================================================
   INICIALIZACIÓN
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    loadSession();
    setupEvents();
});

function setupEvents() {
    loginForm.addEventListener("submit", handleLogin);
    logoutButton.addEventListener("click", logout);
    
    searchButton.addEventListener("click", () => {
        state.currentPage = 1;
        loadRecords();
    });

    previousPage.addEventListener("click", () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            loadRecords();
        }
    });

    nextPage.addEventListener("click", () => {
        state.currentPage++;
        loadRecords();
    });

    addButton.addEventListener("click", openCreateModal);
    modalClose.addEventListener("click", closeModal);
    modalCancel.addEventListener("click", closeModal);
    recordForm.addEventListener("submit", handleSave);

    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            changeModule(button.dataset.module);
        });
    });

    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

/* =========================================================
   FLUJO DE AUTENTICACIÓN (LOGIN)
========================================================= */
async function handleLogin(event) {
    event.preventDefault();
    clearMessage(loginMessage);

    const nombre = document.getElementById("loginNombre").value.trim();
    const password = document.getElementById("loginPassword").value;
    const clave = document.getElementById("loginClave").value;

    if (!nombre || !password || !clave) {
        showMessage(loginMessage, "Todos los campos son obligatorios.", "error");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Ingresando...";

    try {
        const response = await fetch(
            //`${API_BASE_URL}/api/login`,
            `${window.location.origin}/api/login`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, password, clave })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.msg || "No fue posible iniciar sesión.");
        }

        // Persistimos datos devueltos por el backend monolito
        state.token = result.token;
        state.usuario = result.usuario;
        state.empresa = result.empresas && result.empresas.length > 0 ? result.empresas[0].Nombre : "Empresa General";
        state.rol = result.rol;

        saveSession();
        showApplication();
    } catch (error) {
        console.error("Error login:", error);
        showMessage(loginMessage, error.message, "error");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Ingresar";
    }
}

function saveSession() {
    sessionStorage.setItem("token", state.token);
    sessionStorage.setItem("usuario", state.usuario);
    sessionStorage.setItem("empresa", state.empresa);
    sessionStorage.setItem("rol", state.rol);
}

function loadSession() {
    const token = sessionStorage.getItem("token");
    if (!token) {
        showLogin();
        return;
    }
    state.token = token;
    state.usuario = sessionStorage.getItem("usuario");
    state.empresa = sessionStorage.getItem("empresa");
    state.rol = sessionStorage.getItem("rol");
    showApplication();
}

function logout() {
    sessionStorage.clear();
    state.token = null;
    state.usuario = null;
    state.empresa = null;
    state.rol = null;
    state.currentModule = null;
    state.currentPage = 1;
    state.records = [];
    showLogin();
}

function showLogin() {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    loginForm.reset();
    clearMessage(loginMessage);
}

function showApplication() {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    companyName.textContent = state.empresa || "---";
    sidebarUserName.textContent = state.usuario || "---";
    userRole.textContent = state.rol || "---";

    if (state.usuario) {
        userInitial.textContent = state.usuario.charAt(0).toUpperCase();
    }

    welcomeView.classList.remove("hidden");
    moduleView.classList.add("hidden");
    clearModuleData();
}

/* =========================================================
   MANEJO DE MÓDULOS DINÁMICOS
========================================================= */
function changeModule(moduleName) {
    if (!MODULES[moduleName]) return;

    state.currentModule = moduleName;
    state.currentPage = 1;
    clearModuleData();

    const module = MODULES[moduleName];
    moduleTitle.textContent = module.title;
    moduleDescription.textContent = module.description;

    filterText.value = "";
    pageSize.value = "50"; // Default del backend monolito
    orderField.value = "1";
    orderDirection.value = "DESC";

    clearTable();
    welcomeView.classList.add("hidden");
    moduleView.classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.module === moduleName);
    });
}

function clearModuleData() {
    state.records = [];
    clearTable();
    clearMessage(moduleMessage);
    pageInformation.textContent = "Página 1";
}

/* =========================================================
   CONSUMO DE ENDPOINTS CON FETCH & AWAIT
========================================================= */
async function loadRecords() {
    if (!state.currentModule) return;

    const module = MODULES[state.currentModule];
    const payload = {
        pagina: state.currentPage,
        campoOrdenar: Number(orderField.value),
        orden: orderDirection.value,
        textoFiltro: filterText.value.trim()
    };

    // Requerimientos específicos de rutas por empresa
    if (state.currentModule !== "empresas" && state.currentModule !== "usuarios") {
        payload.idEmpresa = 1; // ID de empresa pivote para la sesión activa
    }

    // El endpoint de usuarios maneja una estructura de paginación simple
    if (state.currentModule === "usuarios") {
        delete payload.campoOrdenar;
        delete payload.orden;
        delete payload.textoFiltro;
        payload.pagina = state.currentPage;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Consultando...";
    clearMessage(moduleMessage);

    try {
        const headers = {
            "Content-Type": "application/json",
            "token": state.token // Encabezado de token plano según la especificación técnica
        };

        const config = {
            method: "POST", // Se usa POST para transportar filtros complejos según el formato del backend
            headers: headers
        };

        if (state.currentModule === "usuarios") {
            config.body = JSON.stringify({ pagina: state.currentPage });
        } else if (state.currentModule !== "empresas") {
            config.body = JSON.stringify(payload);
        } else {
            config.method = "POST";
        }

        const response = await fetch(
            //`${API_BASE_URL}${module.endpoint}`,
            `${window.location.origin}${module.endpoint}`,
            config
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.msg || "Error consultando los datos del servidor.");
        }

        state.records = result.data || [];
        renderTable(state.records);
        updatePagination();
    } catch (error) {
        console.error("Error cargando registros:", error);
        state.records = [];
        clearTable();
        showMessage(moduleMessage, error.message, "error");
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = "Consultar";
    }
}

/* =========================================================
   RENDERIZACIÓN DE TABLAS
========================================================= */
function renderTable(records) {
    dataTableHead.innerHTML = "";
    dataTableBody.innerHTML = "";

    if (!records || records.length === 0) {
        emptyTable.classList.remove("hidden");
        return;
    }

    emptyTable.classList.add("hidden");
    const columns = Object.keys(records[0]);

    // Crear Encabezados
    const headerRow = document.createElement("tr");
    columns.forEach(column => {
        const th = document.createElement("th");
        th.textContent = formatColumnName(column);
        headerRow.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.textContent = "Acciones";
    headerRow.appendChild(actionTh);
    dataTableHead.appendChild(headerRow);

    // Crear Filas
    records.forEach(record => {
        const row = document.createElement("tr");
        columns.forEach(column => {
            const cell = document.createElement("td");
            cell.textContent = formatValue(record[column]);
            row.appendChild(cell);
        });

        const actionTd = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.className = "table-action";
        editBtn.textContent = "Editar";
        editBtn.addEventListener("click", () => openEditModal(record));
        actionTd.appendChild(editBtn);
        row.appendChild(actionTd);

        dataTableBody.appendChild(row);
    });
}

/* =========================================================
   FORMULARIOS DINÁMICOS EN EL MODAL
========================================================= */
function openCreateModal() {
    if (!state.currentModule) return;
    state.editingRecord = null;
    modalTitle.textContent = `Crear ${MODULES[state.currentModule].title}`;
    buildFormFields();
    modalOverlay.classList.remove("hidden");
}

function openEditModal(record) {
    if (!state.currentModule) return;
    state.editingRecord = record;
    modalTitle.textContent = `Editar ${MODULES[state.currentModule].title}`;
    buildFormFields(record);
    modalOverlay.classList.remove("hidden");
}

function buildFormFields(record = null) {
    modalFields.innerHTML = "";
    const fields = MODULES[state.currentModule].campos;

    fields.forEach(field => {
        if (field.editOnly && !record) return;

        const wrapper = document.createElement("div");
        wrapper.className = "modal-field";
        if (field.type === "textarea") wrapper.classList.add("full-width");

        const label = document.createElement("label");
        label.textContent = field.label;

        let input;
        if (field.type === "select") {
            input = document.createElement("select");
            field.options.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt;
                option.textContent = opt.toUpperCase();
                input.appendChild(option);
            });
        } else if (field.type === "textarea") {
            input = document.createElement("textarea");
        } else {
            input = document.createElement("input");
            input.type = field.type;
        }

        input.name = field.name;
        if (field.required) input.required = true;
        
        if (record) {
            if (record[field.name] !== undefined) {
                input.value = record[field.name];
            } else if (field.name === "idEmpresa" && record.Id) {
                input.value = record.Id;
            } else if (field.name === "idUsuario" && record.usuario_id) {
                input.value = record.usuario_id;
            } else if (field.name === "idTercero" && record.Id) {
                input.value = record.Id;
            } else if (field.name === "idCategoria" && record.Id) {
                input.value = record.Id;
            } else if (field.name === "idTipoDocumento" && record.Id) {
                input.value = record.Id;
            } else if (field.name === "idUnidadMedida" && record.Id) {
                input.value = record.Id;
            }
        }

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        modalFields.appendChild(wrapper);
    });
}

/* =========================================================
   GUARDAR: CREAR O EDITAR REGISTROS (AWAIT FETCH)
========================================================= */
async function handleSave(event) {
    event.preventDefault();
    if (!state.currentModule) return;

    const module = MODULES[state.currentModule];
    const formData = new FormData(recordForm);
    const payload = {};

    formData.forEach((value, key) => {
        if (key.startsWith("id") || key === "campoOrdenar" || key === "idTipoDocumento") {
            payload[key] = Number(value);
        } else if (value === "true") {
            payload[key] = true;
        } else if (value === "false") {
            payload[key] = false;
        } else {
            payload[key] = value;
        }
    });

    if (payload.Nombre && state.currentModule === "unidadMedidas") {
        payload.Nombre = payload.Nombre.toUpperCase();
    }

    modalSave.disabled = true;
    modalSave.textContent = "Guardando...";

    try {
        const urlEndpoint = state.editingRecord ? module.actualizar : module.crear;
        const methodType = state.editingRecord ? "PUT" : "POST";

        const response = await fetch(
            //`${API_BASE_URL}${urlEndpoint}`,
            `${window.location.origin}${urlEndpoint}`,
            {
                method: methodType,
                headers: {
                    "Content-Type": "application/json",
                    "token": state.token
                },
                body: JSON.stringify(payload)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.msg || "Ocurrió un error al procesar la solicitud en el backend.");
        }

        closeModal();
        showMessage(moduleMessage, result.msg || "Operación realizada con éxito.", "success");
        await loadRecords();
    } catch (error) {
        console.error("Error guardando:", error);
        alert(error.message);
    } finally {
        modalSave.disabled = false;
        modalSave.textContent = "Guardar";
    }
}

function closeModal() {
    modalOverlay.classList.add("hidden");
    recordForm.reset();
    modalFields.innerHTML = "";
    state.editingRecord = null;
}

/* =========================================================
   FORMATEADORES Y AUXILIARES
========================================================= */
function updatePagination() {
    pageInformation.textContent = `Página ${state.currentPage}`;
    previousPage.disabled = state.currentPage <= 1;
    nextPage.disabled = state.records.length < 50;
}

function clearTable() {
    dataTableHead.innerHTML = "";
    dataTableBody.innerHTML = "";
    emptyTable.classList.add("hidden");
}

function formatColumnName(column) {
    return column
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, char => char.toUpperCase());
}

function formatValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
}

function clearMessage(element) {
    element.textContent = "";
    element.className = "message";
}
