window.addEventListener('DOMContentLoaded', () => {
  renderMathInElement(document.body, {
    delimiters: [{left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},{left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}],
    throwOnError:false,
    trust:true,
    macros: {'\\class':'\\htmlClass{#1}{#2}', '\\dhline':'\\hline\\hline'}
  });
});
