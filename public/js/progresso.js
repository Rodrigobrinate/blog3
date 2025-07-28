document.addEventListener('DOMContentLoaded', () => {

    const container = document.querySelector('.aulas-page-container');
    if (!container) {
        // Se não estiver na página de aulas, não faz nada.
        return;
    }

    const cursoId = container.id;

    function atualizarProgresso() {
        const todasAsAulas = container.querySelectorAll('.aulas-list input[type="checkbox"]');
        const aulasConcluidas = container.querySelectorAll('.aulas-list input[type="checkbox"]:checked');
        const percentual = todasAsAulas.length > 0 ? (aulasConcluidas.length / todasAsAulas.length) * 100 : 0;
        
        const barraPreenchimento = container.querySelector('.progresso-preenchimento');
        const textoPercentual = container.querySelector('.progresso-percentual');
        
        if (barraPreenchimento && textoPercentual) {
            barraPreenchimento.style.width = `${percentual}%`;
            textoPercentual.textContent = `${Math.round(percentual)}%`;
        }
    }
    
    function salvarProgresso() {
        const aulasConcluidasIds = [];
        container.querySelectorAll('.aulas-list input[type="checkbox"]:checked').forEach(checkbox => {
            aulasConcluidasIds.push(checkbox.id);
        });
        localStorage.setItem(`progresso_${cursoId}`, JSON.stringify(aulasConcluidasIds));
    }

    function carregarProgresso() {
        const progressoSalvo = localStorage.getItem(`progresso_${cursoId}`);
        if (progressoSalvo) {
            const aulasConcluidasIds = JSON.parse(progressoSalvo);
            aulasConcluidasIds.forEach(aulaId => {
                const checkbox = document.getElementById(aulaId);
                if (checkbox) checkbox.checked = true;
            });
        }
        atualizarProgresso();
    }

    container.querySelectorAll('.aulas-list input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            salvarProgresso();
            atualizarProgresso();
        });
    });

    carregarProgresso();
});