/*document.write("<script src='db/DBConnection.js' type='text/javascript'></script>");*/
document.write("<script src='misc/sjcl.js'></script>");

function decryptSN(toDecrypt)
{
	var decrypted = toDecrypt;
	return decrypted;
}
function encryptSN(toCrypt)
{
    var encrypted = toCrypt;
	return encrypted;
}

 async function getPermitions(op)
{
	var query = "SELECT * from distribuicao where code = '" +op+"'";
	var result = await window.db.exec(query,'get');
	console.log(result);
	
	//var result = 0;
	//while (results2.isValidRow())
	/*while (results2){
		//decrypt
	
		result = decryptSN(results2.enabled);
		
		//encrypt
		//result = results2.fieldByName("enabled");
		
		results2.next();
	}
	results2.close();*/
	//decrypt
	//var query2 = "update distribuicao SET enabled = '"+result+"' WHERE code = '" +op+"'";
	//dbExecute(query2);
	
	//encrypt
	//var query2 = "update distribuicao SET enabled = '"+encryptSN(result)+"' WHERE code = '" +op+"'";
	//dbExecute(query2);
	result.forEach(element => {
		element.enabled = decryptSN(element.enabled);
	});
	console.log(result);
	return result;
}
async function getQuestionsToDecrypt()
{
//alert("a Desencryptar")
	var query = "SELECT * from perguntas where pergunta like '{%'";
	var results2 = await window.db.exec(query,'get');
	
	var perg = 0; var res1 = 0; var res2 = 0; var res3 = 0; var res4 = 0; var id=0;
	
	var query2 = "";

	results2.forEach(element => {
		id = element.id;
		perg = decryptSN(element.pergunta);
		res1 = decryptSN(element.resposta_a);
		res2 = decryptSN(element.resposta_b);
		res3 = decryptSN(element.resposta_c);
		res4 = decryptSN(element.resposta_d);

		query2 += "update perguntas SET pergunta = '"+perg+"', resposta_a = '"+res1+"', resposta_b = '"+res2+"', resposta_c = '"+res3+"', resposta_d = '"+res4+"' WHERE id = '" +id+"'; ";
	});
	
	/*while (results2.isValidRow())
	{
		//decrypt
		//result = decryptSN(results2.fieldByName("enabled"));
		
		//encrypt
		id = results2.fieldByName("id");
		perg = decryptSN(results2.fieldByName("pergunta"));
		res1 = decryptSN(results2.fieldByName("resposta_a"));
		res2 = decryptSN(results2.fieldByName("resposta_b"));
		res3 = decryptSN(results2.fieldByName("resposta_c"));
		res4 = decryptSN(results2.fieldByName("resposta_d"));

		query2 += "update perguntas SET pergunta = '"+perg+"', resposta_a = '"+res1+"', resposta_b = '"+res2+"', resposta_c = '"+res3+"', resposta_d = '"+res4+"' WHERE id = '" +id+"'; ";
		
		results2.next();
	}
	results2.close();*/
	
	//alert("Terminou! obrigado");
	//alert(query2)
	
	await window.db.exec(query2,'run');
	//decrypt
	//var query2 = "update distribuicao SET enabled = '"+result+"' WHERE code = '" +op+"'";
	//dbExecute(query2);
	
	//encrypt
	//var query2 = "update distribuicao SET enabled = '"+encryptSN(result)+"' WHERE code = '" +op+"'";
	//dbExecute(query2);
	
	return result;
}

async function getQuestionsToEncryptEN()
{alert("iniciei")
var query = "SELECT * from perguntas where categoria=3 and pergunta_en != 'ignorar' and pergunta_en != '' and pergunta_en not like '{%'";
var results2 = await window.db.exec(query, 'get');

var perg = 0, res1 = 0, res2 = 0, res3 = 0, res4 = 0, id = 0;

try {
    // Inicia uma transação
    await window.db.exec('BEGIN TRANSACTION');

    // Itera sobre os resultados e cria uma query de atualização para cada registo
    for (const element of results2) {
        id = element.id;
        perg = encryptSN(element.pergunta_en);
        res1 = encryptSN(element.resposta_a_en);
        res2 = encryptSN(element.resposta_b_en);
        res3 = encryptSN(element.resposta_c_en);
        res4 = encryptSN(element.resposta_d_en);

        // Executa a query de atualização para cada registo
        var query2 = `
            UPDATE perguntas 
            SET pergunta_en = '${perg}', 
                resposta_a_en = '${res1}', 
                resposta_b_en = '${res2}', 
                resposta_c_en = '${res3}', 
                resposta_d_en = '${res4}' 
            WHERE id = '${id}';
        `;
        await window.db.exec(query2, 'run');
    }

    // Confirma a transação
    await window.db.exec('COMMIT');
} catch (err) {
    // Em caso de erro, desfaz a transação
    await window.db.exec('ROLLBACK');
    console.error('Erro ao atualizar as perguntas:', err);
}

	alert("acabei");
}


async function getQuestionsToEncrypt()
{alert("iniciei")
var query = "SELECT * from perguntas where pergunta not like '{%'";
var results2 = await window.db.exec(query, 'get');

var perg = 0, res1 = 0, res2 = 0, res3 = 0, res4 = 0, id = 0;

try {
    // Inicia uma transação
    await window.db.exec('BEGIN TRANSACTION');

    // Itera sobre os resultados e cria uma query de atualização para cada registo
    for (const element of results2) {
        id = element.id;
        perg = encryptSN(element.pergunta);
        res1 = encryptSN(element.resposta_a);
        res2 = encryptSN(element.resposta_b);
        res3 = encryptSN(element.resposta_c);
        res4 = encryptSN(element.resposta_d);

        // Executa a query de atualização para cada registo
        var query2 = `
            UPDATE perguntas 
            SET pergunta = '${perg}', 
                resposta_a = '${res1}', 
                resposta_b = '${res2}', 
                resposta_c = '${res3}', 
                resposta_d = '${res4}' 
            WHERE id = '${id}';
        `;
        await window.db.exec(query2, 'run');
    }

    // Confirma a transação
    await window.db.exec('COMMIT');
} catch (err) {
    // Em caso de erro, desfaz a transação
    await window.db.exec('ROLLBACK');
    console.error('Erro ao atualizar as perguntas:', err);
}

	alert("acabei");
}


async function getAllPermitions()
{
	var query = "SELECT code, enabled from distribuicao";
	var results2 = await window.db.exec(query,'get');
	return results2;
}
async function getValidator(op)
{
	var query = "SELECT keepCode from distribuicao where code = '" +op+"'";	
	var results2 = await window.db.exec(query,'get');	
	var result = "";
	while (results2.isValidRow())
	{
		result = (results2.fieldByName("keepCode"));
		results2.next();
	}
	results2.close();
	return result;
}
async function getValidatorLetter(op)
{
	var query = "SELECT keepCodeLetter from distribuicao where code = '" +op+"'";	
	var results2 = await window.db.exec(query,'get');	
	var result = "";
	while (results2.isValidRow())
	{
		result = (results2.fieldByName("keepCodeLetter"));
		results2.next();
	}
	results2.close();
	return result;
}
async function saveValidatorKey(op,code)
{
	var query = "update distribuicao set keepCode = '"+code+"' where code = '" +op+"'";	
	await window.db.exec(query,'run');
}
async function getAllDistribution()
{
	var query = "SELECT * FROM distribuicao ORDER BY id";
	var results = await window.db.exec(query,'get');		
	return results;
}
async function updateDist(q_id, code, name, enabled)
{
	var query = "update distribuicao SET code = '"+code+"', name = '"+name+"', enabled = '"+enabled+"' WHERE id = "+q_id;
	await window.db.exec(query,'run');
}
async function getAllQuestions()
{
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas where pergunta not like '{%' ORDER BY id";
	var results = await window.db.exec(query,'get');
	return results;
}
async function getAllTQuestions()
{
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntasTematico ORDER BY id";
	var results = await window.db.exec(query,'get');
	return results;
}
async function getAllQuestionsById(id)
{
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas where id in ("+id+")";
	var results = await window.db.exec(query,'get');
	return results;
}
async function updateQuestion(numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d)
{
	var query = "update perguntas SET pergunta = '"+pergunta+"', resposta_a = '"+resposta_a+"', resposta_b = '"+resposta_b+"', resposta_c = '"+resposta_c+"', resposta_d = '"+resposta_d+"' WHERE id = "+numero;
	await window.db.exec(query,'run');
}
async function updateTQuestion(numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d)
{
	var query = "update perguntasTematico SET pergunta = '"+pergunta+"', resposta_a = '"+resposta_a+"', resposta_b = '"+resposta_b+"', resposta_c = '"+resposta_c+"', resposta_d = '"+resposta_d+"' WHERE id = "+numero;
	await window.db.exec(query,'run');
}
async function getQuestionsByNum(num,cat,testType)
{
	var order = " ORDER BY RANDOM()";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tipoteste = " + testType + order + "  LIMIT "+num;
	var results = await window.db.exec(query,'get');		
	return results;
}
async function getQuestionsByNumId(cat,testType,num)
{	
	var query = "SELECT p.id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta, (select tema.nome from tema where p.tema = tema.tema  and p.categoria = tema.cat_id) as nomeTema, (select tema.tema from tema where p.tema = tema.tema  and p.categoria = tema.cat_id) as tema, (select subtema.nome from subtema where p.subtema = subtema.subtema  and p.categoria = subtema.cat_id) as nomeSubtema, (select subtema.subtema from subtema where p.subtema = subtema.subtema  and p.categoria = subtema.cat_id) as subtema";
		query += " FROM perguntas p";
		query += " WHERE categoria = "+cat+"";
		query += " and tipoteste = "+testType+"";
		query += " and numero = "+num;
	var results = await window.db.exec(query,'get');		
	return results;
}
async function getTotalQuestionsByTheme(cat,theme,testType)
{	
	var query = "SELECT count(id) as total FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType;
	var results = await window.db.exec(query,'get');
	return results;
}
async function getTotalWrongQuestionsByTheme(cat,theme,testType)
{	
	var query = "SELECT count(id) as total FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType + " and erradas > 3";
	var results = await window.db.exec(query,'get');
	return results;
}
async function getTotalWrongQuestionsBySubTheme(cat,theme,subtheme,testType)
{	
	var query = "SELECT count(id) as total FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and subtema = " + subtheme + " and tipoteste = " + testType + " and erradas > 3";
	var results = await window.db.exec(query,'get');
	return results;
}

async function getWrongQuestionsBySubThemeTest(num,cat,theme,subtheme,test,testType)
{
	var order = " ORDER BY id ASC";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and subtema = " + subtheme + " and erradas > 3 and tipoteste = " + testType + order + "  LIMIT "+test+","+num;
	var results = await window.db.exec(query,'get');		
	return results;
}
async function getWrongQuestionsByThemeTest(num,cat,theme,test,testType)
{
	var order = " ORDER BY id ASC";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and erradas > 3 and tipoteste = " + testType + order + "  LIMIT "+test+","+num;
	var results = await window.db.exec(query,'get');
	return results;
}
async function getQuestionsByThemeTest(num,cat,theme,test,testType)
{
	var order = " ORDER BY id ASC";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType + order + "  LIMIT "+test+","+num;
	var results = await window.db.exec(query,'get');
	return results;
}

async function getQuestionsBySubThemeTest1(num,cat,theme,subtheme,test,testType)
{
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and subtema = " + subtheme + " and tipoteste = " + testType + " ORDER BY id ASC" + "  LIMIT "+test+","+num;
	var results = await window.db.exec(query,'get');
	return results;
}
async function getAllQuestionsByTest(num,cat,test,testType,lang)
{
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, pergunta_en, resposta_a_en, resposta_b_en, resposta_c_en, resposta_d_en, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tipoteste = " + testType + " Group by numero ORDER BY tema, numero ASC" + "  LIMIT "+test+","+num;
	// MASTER SET: linguagem não altera a seleção de perguntas (uma só lista para PT/EN)
	
	var results = await window.db.exec(query,'get');
	return results;
}
async function getTotalQuestionsBySubThemeTest(cat,theme,subtheme,testType)
{	
	var order = " ORDER BY id ASC";
	var query = "SELECT count(id) as total FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and subtema = " + subtheme + " and tipoteste = " + testType + order;
	var results = await window.db.exec(query,'get');
	return results;
}
async function getQuestionsBySubThemeTestSpecial(num,cat,theme,subtheme,testType)
{
	var order = " ORDER BY RANDOM()";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType + order + "  LIMIT 0,"+num;
	var results = await window.db.exec(query,'get');
	return results;
}
async function getQuestionsByThemeTestSpecial(num,cat,theme,testType)
{
	var order = " ORDER BY id ASC";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType + order + "  LIMIT 0,"+num;
	var results = await window.db.exec(query,'get');	
	return results;
}
async function getQuestionsByTheme(num,cat,theme,testType)
{
	
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType + " ORDER BY RANDOM()" + "  LIMIT "+num;
	var results = await window.db.exec(query,'get'); query = null; delete query;		
	return results;
}

async function getQuestionsBySubTheme(num,cat,theme,subtheme,testType,lang)
{
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, pergunta_en, resposta_a_en, resposta_b_en, resposta_c_en, resposta_d_en, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + "  and (subtema = " + subtheme + ") and tipoteste = " + testType + " and tipo=0 ORDER BY RANDOM()" + "  LIMIT "+num;
	
	if (lang != null && false && lang == 'en') /* MASTER SET: linguagem não filtra perguntas */
	{
		query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, pergunta_en, resposta_a_en, resposta_b_en, resposta_c_en, resposta_d_en, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + "  and (subtema = " + subtheme + ") and tipoteste = " + testType + " and tipo=0 and pergunta_en != 'ignorar' ORDER BY RANDOM()" + "  LIMIT "+num;
	}
	
	var results = await window.db.exec(query,'get'); query = null; delete query;
	return results;
}

async function getQuestionsByCatType(cat,testType,lang)
{
	var query = "select * from (SELECT t.numPergs, s.nPerg_imtt, s.nPerg_sr, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.imagem, p.imagem_en, p.correcta, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" WHERE p.categoria = "+ cat + " and tipo=0 and p.tipoteste = " + testType + " ) as coco order BY coco.tema asc, coco.subtema asc, random()";	
	
	if (false && lang == 'en') /* MASTER SET: linguagem não filtra perguntas */
	{
		query = "select * from (SELECT t.numPergs, s.nPerg_imtt, s.nPerg_sr, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.imagem, p.imagem_en, p.correcta, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" WHERE p.categoria = "+ cat + " and tipo=0 and p.tipoteste = " + testType + " and pergunta_en != 'ignorar' ) as coco order BY coco.tema asc, coco.subtema asc, random()";	
	}
	
	var results = await window.db.exec(query,'get'); query = null; delete query;
	return results;
}

async function getQuestionsByCatTypeTheme(cat,testType,theme,lang)
{
	var query = "SELECT t.numPergs, s.nPerg_imtt_tema, s.nPerg_sr_tema, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en, p.imagem, p.imagem_en, p.correcta FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" and t.tema = "+theme+" WHERE p.categoria = "+ cat + " and tipo=0 and p.tipoteste = " + testType + " and p.tema = "+theme+" ORDER BY p.subtema asc ";	
	
	if(false && lang == 'en') /* MASTER SET: linguagem não filtra perguntas */
	{
		query = "SELECT t.numPergs, s.nPerg_imtt_tema, s.nPerg_sr_tema, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en, p.imagem, p.imagem_en, p.correcta FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" and t.tema = "+theme+" WHERE p.categoria = "+ cat + " and tipo=0 and p.tipoteste = " + testType + " and p.tema = "+theme+" and pergunta_en != 'ignorar' ORDER BY p.subtema asc ";	
	}

	var results = await window.db.exec(query,'get'); query = null; delete query;
	return results;
}
async function getQtsByCatTypeThemeSpc(cat,testType,theme)
{
	var query = "SELECT t.numPergs, s.nPerg_imtt_tema, s.nPerg_sr_tema, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en, p.imagem, p.imagem_en, p.correcta FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" and t.tema = "+theme+" WHERE p.categoria = "+ cat + " and tipo=1 and p.tipoteste = " + testType + " and p.tema = "+theme+" ORDER BY p.subtema asc ";	
	var results = await window.db.exec(query,'get'); query = null; delete query;
	return results;
}
async function getWrongQuestionsByCatType(cat,testType,lang)
{
	var query = "SELECT t.numPergs, s.nPerg_imtt, s.nPerg_sr, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en, p.imagem, p.imagem_en, p.correcta FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" WHERE p.categoria = "+ cat + " and p.tipoteste = " + testType + " and erradas > 3 ORDER BY p.tema, p.subtema asc ";	
	
	if (false && lang == 'en') /* MASTER SET: linguagem não filtra perguntas */
	{
		query = "SELECT t.numPergs, s.nPerg_imtt, s.nPerg_sr, p.id, p.numero, t.tema, s.subtema, p.pergunta, p.resposta_a, p.resposta_b, p.resposta_c, p.resposta_d, p.pergunta_en, p.resposta_a_en, p.resposta_b_en, p.resposta_c_en, p.resposta_d_en, p.imagem, p.imagem_en, p.correcta FROM perguntas p left join subtema s on s.subtema = p.subtema and s.tem_tipoteste = " + testType + " and s.cat_id = "+ cat +" left join tema t on t.tema = p.tema and t.tem_tipoteste = " + testType + " and t.cat_id = "+ cat +" WHERE p.categoria = "+ cat + " and p.tipoteste = " + testType + " and erradas > 3 and pergunta_en != 'ignorar' ORDER BY p.tema, p.subtema asc ";	
	}
	
	var results = await window.db.exec(query,'get'); query = null; delete query;
	return results;
}


async function getQuestionsByThemeSpecial(num,catA,catB,theme,testType)
{
	var order = " ORDER BY RANDOM()";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType + order + "  LIMIT "+num;
	var results = await window.db.exec(query,'get');	
	return results;
}
async function getQuestionsByTest(num,cat,test,testType)
{
	var order = " ORDER BY id ASC";
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, imagem_en, correcta FROM perguntas WHERE categoria = "+ cat + " and tipoteste = " + testType + order + "  LIMIT "+test+","+num;
	var results = await window.db.exec(query,'get');	
	return results;
}

async function getTotalQuestionsByCat(cat,testType)
{
	var order = " ORDER BY id ASC";
	var query = "SELECT count(id) as total FROM perguntas WHERE categoria = "+ cat + " and tipoteste = " + testType + order;
	var results = await window.db.exec(query,'get');	
	return results;
}

async function getQuestionsResult(ids, examId)
{
	//var query = "SELECT perguntas.id, perguntas.numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, correcta, ajuda, perguntas.categoria as categoria from perguntas where perguntas.id in ("+ids+")";
	
	//var query = "DROP TABLE if exists tb; CREATE TEMP TABLE tb (pId, ord INTEGER PRIMARY KEY AUTOINCREMENT); INSERT INTO tb (pId, ord) VALUES "+ids+" ;";

//CREATE TABLE tb (pId, ord INTEGER PRIMARY KEY AUTOINCREMENT,examId);
//adicionar na tabela de respostas utilizador o campo resultado com Text(500)
//colocar na tabela perguntas o tipo a 0 caso a versão nao seja a do aluno

	//	query += "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, imagem, correcta, ajuda, categoria as categoria  from perguntas  join tb as coco on pId = id order by coco.ord;";
 
	//dbExecute("delete from tb where 1;");
	var str = ids.split('_');
	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');	
	await window.db.exec("delete from tb where examId="+examId,'run');	
	
	for (var i = 0; i<str.length; i++){
		await window.db.exec("INSERT INTO tb (pId, ord, examId) VALUES "+str[i]+" ",'run');	
	}
	
	window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();	
	
	var query = "SELECT id, numero, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, pergunta_en, resposta_a_en, resposta_b_en, resposta_c_en, resposta_d_en, pergunta_pa, resposta_a_pa, resposta_b_pa, resposta_c_pa, resposta_d_pa, imagem, imagem_en, correcta, ajuda, categoria as categoria from perguntas  join tb as coco on pId = id  and examId = "+examId+" order by coco.ord; " 
 
	var results = await window.db.exec(query,'get');
		
	//window.db.execute("delete from tb where examId="+examId);	
	//dbExecute("DROP TABLE tb");	
	
	return results;
}

async function resetTableTemp(examId)
{		
	//var db = getDB();
	window.db.exec("delete from tb where examId="+examId,'run');	
	//db.close();	
	
	return 1;
}

async function getQuestionsResult2(id)
{
	var query = "SELECT resultado from respostasUtilizador where respostasUtilizador.id = "+id;
	var results = await window.db.exec(query,'get');	
	return results;
}

async function setAnswersSafe(Aws,Qts,QtsOrder,NumQts)
{	
	var keepSafer = [];
	for(var i=1; i <= NumQts; i++){
		if (Aws[i] != "" && Aws[i] != undefined){
			keepSafer[i] = Aws[i] + "," + Qts[i] + "," + NumQts + "," + QtsOrder[i] + ";";
		}	
		else{
			if (Qts[i] != "" && Qts[i] != undefined){
				keepSafer[i] = "" + "," + Qts[i] + "," + NumQts + "," + QtsOrder[i] + ";";
			}
		}	
	}	
		
	await window.db.exec("delete from respostasUtilizador where 1",'run');

	await window.db.exec("INSERT INTO respostasUtilizador (resultado) VALUES ('" + keepSafer + "')",'run');	
	var query = " Select  max(id) as id from respostasUtilizador limit 1;";	
	var results = await window.db.exec(query,'get');		
	return results;
}

async function getAnswersSafe(id)
{	
	var query = "SELECT resultado FROM respostasUtilizador where id = "+id;		
	var results = await window.db.exec(query,'get');			
	return results;
}

async function emptyAnswersSafe()
{	
	var query = "delete from respostasUtilizador where 1";	
	var results = await window.db.exec(query,'run');	
	query = results = null;	
	return true;
}

async function setCurrentCat(catId,testType)
{		
	var query = "";			
	query = "INSERT INTO categoriaActual (cat_id, cat_nome, tipo) VALUES ("+ catId +", (select nome from categoria where id = "+ catId +"), (select opDefault from categoria where id = "+catId+"))";		
	await window.db.exec(query,'run');	
	return true;
}

async function setCurrentCatMode(catId,testType,testMode)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');	
	await window.db.exec("INSERT INTO categoriaActual (cat_id, cat_nome, tipo,modo_auto) VALUES ("+ catId +", (select nome from categoria where id = "+ catId +"), "+testType+","+testMode+")",'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}

async function updateCurrentCatValidator(catId,validate,isTest)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');	
	await window.db.exec("UPDATE categoriaActual set valida_path = "+ validate +", is_test = "+isTest+" where cat_id= "+catId,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}
async function updateCurrentCat(catId,theme,subTheme)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');	
	await window.db.exec("UPDATE categoriaActual set tema = "+ theme +", subtema = "+subTheme+" where cat_id= "+catId,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}
async function updateCurrentCatSubtheme(catId,theme,subTheme,allSubSel)
{	
	var query = "";
	//window.db.execute("BEGIN IMMEDIATE TRANSACTION");	
	query = "UPDATE categoriaActual set tema = "+ theme +", subtema = "+subTheme+", all_subthemes_sel = "+allSubSel+" where cat_id= "+catId;		
	//window.db.execute("COMMIT TRANSACTION");	
	await window.db.exec(query,'run');				
	return true;
}
async function updateCurrentCatSpecial(catId,theme,validate)
{	
	var query = "";		
	query = "UPDATE categoriaActual set valida_path = "+validate+", tema = "+ theme +", modo_auto = 0, sub_cat_id = cat_id, cat_id ="+catId;		
	await window.db.exec(query,'run');				
	return true;
}
async function updateCurrentCatSpecial2(catId,subcatId,theme,validate)
{	
	var query = "";		
	query = "UPDATE categoriaActual set valida_path = "+validate+", tema = "+ theme +", modo_auto = 0, sub_cat_id = "+subcatId+", cat_id ="+catId;		
	await window.db.exec(query,'run');				
	return true;
}
async function updateCurrentCatByTest(catId,test)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');
	await window.db.exec("UPDATE categoriaActual set teste = "+ test +" where cat_id= "+catId,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}

async function updateCurrentCatByTestSpecial(catId,test)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');
	await window.db.exec("UPDATE categoriaActual set teste = "+ test +", sub_cat_id = cat_id, cat_id ="+catId,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}

async function updateCurrentCatByTestWP(catId,test)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');
	await window.db.exec("UPDATE categoriaActual set teste = "+ test +", is_test = 1 where cat_id= "+catId,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}

async function updateCurrentCatByTestSpecialWP(catId,test)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');
	await window.db.exec("UPDATE categoriaActual set teste = "+ test +", is_test = 1, sub_cat_id = cat_id, cat_id ="+catId,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}
async function getCurrentCat(catId)
{	
	var query = "SELECT (select enabled from distribuicao where code = 'Pro_line') as proline, categoria.id, nome, numPerg as num_perguntas, tempo, cor, pergAprov, opSR, opIMTT, opTesteExame, opTesteTematico, perg_procura from categoria left join categoriaActual on cat_id = "+catId+" where categoria.id ="+catId;	
	var results = await window.db.exec(query,'get');		
	return results;
}


async function getCurrentCatOrig()
{	
	var query = "SELECT (select enabled from distribuicao where code = 'Pro_line') as proline, categoriaActual.cat_id, nome, numPerg as num_perguntas, tempo, cor, pergAprov, opSR, opIMTT, opTesteExame, opTesteTematico, perg_procura, cat_nome, teste, tipo from categoriaActual, categoria where categoriaActual.cat_id = categoria.id";	
	var results = await window.db.exec(query,'get');	
	return results;
}


async function getTotalQByCatTheme(cat,theme,testType)
{	
	var query = "SELECT count(id) as total FROM perguntas WHERE categoria = "+ cat + " and tema = " + theme + " and tipoteste = " + testType;
	
	var results = await window.db.exec(query,'get');	
	return results;
}

async function emptyCurrentCat()
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');
	await window.db.exec("delete from categoriaActual where 1",'run');	
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();	
	//db = null;			
	return true;
}

async function getThemesByCat(catId,statementC,statementNoC,testType){
	var query = "SELECT nome, COALESCE(NULLIF(NULLIF(NULLIF(nome_en,''),'ignorar'),'null'), nome) as nome_en, tema, (SELECT count(id) as total from perguntas where (" + statementC + ") and tema = tema.tema and categoria = "+catId+") as totalC, (SELECT count(id) as total from perguntas where (" + statementNoC + ") and tema = tema.tema and categoria = "+catId+") as totalNoC from tema where cat_id = " + catId + " and tema.tem_tipoteste="+testType+" order by tema.tema asc";		
	var results = await window.db.exec(query,'get');
	return results;
}

async function getNoCorrectQuestionsByCat(catId,statementNoC){
	var query = "SELECT id from perguntas where (" + statementNoC + ") and categoria = "+catId;		
	var results = await window.db.exec(query,'get');
	return results;
}

async function openDB(){
	var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');
}
async function closeDB(){
	await window.db.exec("COMMIT TRANSACTION",'run');	
	await db.close();				
}
async function updateWrongQuestions(ids){
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');	

	for (const id of ids) {
		await window.db.exec("UPDATE perguntas set erradas = (erradas+1) where id = "+id,'run');	
	}
	/*for(var i=0; i < ids.length; i++){
		await window.db.exec("UPDATE perguntas set erradas = (erradas+1) where id = "+ids[i]);	
	}*/	
	
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;	
	
}

async function getThemesByCatId(catId,theme){
	var query = "SELECT nome, COALESCE(NULLIF(NULLIF(NULLIF(nome_en,''),'ignorar'),'null'), nome) as nome_en, tema, numPergs, numPergsEsp from tema where cat_id = " + catId + " and tem_tipoteste="+theme+" order by tema asc";		
	var results = await window.db.exec(query,'get');	
	return results;
}

async function getThemesAndSubByCatId(catId,testType){
	var query = "SELECT t.tema, t.numPergs, s.subtema, s.nPerg_sr, s.nPerg_imtt";
		query += " from tema t";
		query += " left join subtema s on s.tema = t.tema and s.tem_tipoteste=t.tem_tipoteste and s.cat_id = t.cat_id";
		query += " where t.cat_id = " + catId + " and t.tem_tipoteste="+testType;
	
	var results = await window.db.exec(query,'get');		
	return results;
}

async function getSpecialThemesByCatId(catId,test){
	var query = "SELECT (SELECT count(id) FROM perguntas WHERE categoria = "+ catId + " and tema = t.tema and tipoteste = " + test+") as total, nome, tema, numPergs, numPergsEsp from tema t where cat_id = " + catId + " and tem_tipoteste="+test;		
	var results = await window.db.exec(query,'get');		
	return results;
}

async function getWrongThemesByCatId(catId,test){
	var query = "SELECT (SELECT count(id) FROM perguntas WHERE categoria = "+ catId + " and tema = t.tema and tipoteste = " + test+" and erradas > 3) as total, nome, tema, numPergs, numPergsEsp from tema t where cat_id = " + catId + " and tem_tipoteste="+test;		
	var results = await window.db.exec(query,'get');		
	return results;
}

async function getThemesDetByCatId(catId,testType){
	var query = "SELECT nome, tema, numPergs, numPergsEsp, (SELECT count(id) as total FROM perguntas WHERE categoria = "+catId+" and tema = t.tema and tipoteste = "+testType+") as total from tema t where cat_id = " + catId;		
	var results = await window.db.exec(query,'get');	
	return results;
}

async function getSubThemesByCatId(catId,theme,testType){
	var query = "SELECT nome, COALESCE(NULLIF(NULLIF(NULLIF(nome_en,''),'ignorar'),'null'), nome) as nome_en, subtema, tema from subtema where cat_id = " + catId + " and tema = "+theme+" and tem_tipoteste = "+testType;	
	var results = await window.db.exec(query,'get');		
	return results;
}
async function getSubThemesByCatIdAndType(catId,theme,testType){
	var query = "SELECT nome, COALESCE(NULLIF(NULLIF(NULLIF(nome_en,''),'ignorar'),'null'), nome) as nome_en, subtema, tema, nPerg_sr, nPerg_imtt, nPerg_sr_tema, nPerg_imtt_tema from subtema where cat_id = " + catId + " and tema = "+theme+" and tem_tipoteste = "+testType;		
	var results = await window.db.exec(query,'get');		
	return results;
}
async function getSubThemesByCatIdAndType2(catId,testType){
	var query = "SELECT nome, subtema, tema, nPerg_sr, nPerg_imtt, nPerg_sr_tema, nPerg_imtt_tema from subtema where cat_id = " + catId + " and tem_tipoteste = "+testType;		
	var results = await window.db.exec(query,'get');		
	return results;
}

async function getSubThemesQ(catId,theme,testType){
	var query = "SELECT (select count(id) from perguntas where subtema = s.subtema and cat_id = "+catId+" and tema = "+theme+" and tipoteste = "+testType+") as total, nome, subtema, tema, nPerg_sr, nPerg_imtt, nPerg_sr_tema, nPerg_imtt_tema from subtema s where cat_id = " + catId + " and tema = "+theme+" and tem_tipoteste = "+testType;		
	var results = await window.db.exec(query,'get');	
	return results;
}
async function getWrongSubThemesQ(catId,theme,testType){
	var query = "SELECT (select count(id) from perguntas where subtema = s.subtema and cat_id = "+catId+" and tema = "+theme+" and tipoteste = "+testType+" and erradas > 3) as total, nome, subtema, tema, nPerg_sr, nPerg_imtt, nPerg_sr_tema, nPerg_imtt_tema from subtema s where cat_id = " + catId + " and tema = "+theme+" and tem_tipoteste = "+testType;		
	var results = await window.db.exec(query,'get');		
	return results;
}

async function getThemeById(theme,catId){
	var query = "SELECT nome, COALESCE(NULLIF(NULLIF(NULLIF(nome_en,''),'ignorar'),'null'), nome) as nome_en from tema where cat_id = " + catId + " and tema = "+theme;		
	var results = await window.db.exec(query,'get');	
	return results;
}

async function getModeInterval(catId){
	var query = "SELECT tempo from intervaloModoTeste where cat_id = " + catId;		
	var results = await window.db.exec(query,'get');		
	return results;
}


async function updateCurrentQuestionNum(num)
{	
	//var db = getDB();
	await window.db.exec("BEGIN IMMEDIATE TRANSACTION",'run');	
	await window.db.exec("UPDATE categoriaActual set perg_procura = "+ num,'run');		
	await window.db.exec("COMMIT TRANSACTION",'run');	
	//db.close();				
	return true;
}
async function setCurrentQuestionNum(val)
{	
	//var db = getDB();
	await window.db.execute("BEGIN IMMEDIATE TRANSACTION",'run');	
	await window.db.execute("UPDATE categoriaActual set perg_procura = (perg_procura + ("+ val + "))",'run');	
	await window.db.execute("COMMIT TRANSACTION",'run');	
	//db.close();	
	return true;
}

/* ===== Integração IA (cache permanente na BD) ===== */

async function getAIState(qid)
{
	var query = "SELECT pergunta_en, resposta_a_en, resposta_b_en, resposta_c_en, resposta_d_en, pergunta_pa, resposta_a_pa, resposta_b_pa, resposta_c_pa, resposta_d_pa, explicacao_pt, explicacao_en, explicacao_pa, explicacao_ok FROM perguntas WHERE id = " + qid;
	var results = await window.db.exec(query,'get');
	return results;
}

function aiSql(value){
	return String(value == null ? '' : value).replace(/'/g, "''");
}

async function getAIQuestionSource(qid)
{
	var query = "SELECT id, pergunta, resposta_a, resposta_b, resposta_c, resposta_d, correcta, imagem FROM perguntas WHERE id = " + Number(qid);
	return await window.db.exec(query,'get');
}

async function getEquivalentAIExplanation(question, correctText)
{
	var q = aiSql(question), a = aiSql(correctText);
	var query = "SELECT explicacao_pt, explicacao_en, explicacao_pa, explicacao_ok FROM perguntas WHERE pergunta = '" + q + "' AND CASE upper(correcta) WHEN 'A' THEN resposta_a WHEN 'B' THEN resposta_b WHEN 'C' THEN resposta_c WHEN 'D' THEN resposta_d ELSE '' END = '" + a + "' AND explicacao_ok = 1 AND explicacao_pt LIKE '✅ Resposta correta: " + a + "%' AND explicacao_en IS NOT NULL AND explicacao_pa IS NOT NULL LIMIT 1";
	return await window.db.exec(query,'get');
}

async function saveEquivalentAIExplanation(question, correctText, data)
{
	var q = aiSql(question), a = aiSql(correctText);
	var pt = aiSql(data.explanation_pt), en = aiSql(data.explanation_en), pa = aiSql(data.explanation_pa);
	var query = "UPDATE perguntas SET explicacao_pt='" + pt + "', explicacao_en='" + en + "', explicacao_pa='" + pa + "', explicacao_ok=1 WHERE pergunta = '" + q + "' AND CASE upper(correcta) WHEN 'A' THEN resposta_a WHEN 'B' THEN resposta_b WHEN 'C' THEN resposta_c WHEN 'D' THEN resposta_d ELSE '' END = '" + a + "'";
	await window.db.exec(query,'run');
	return true;
}
async function saveAIResult(qid, data)
{
	var esc = function(s){
		if (s == null || s == undefined) return '';
		return String(s).replace(/'/g,"''");
	};
	var query = "UPDATE perguntas SET "
		+ "pergunta_en = COALESCE(NULLIF('" + esc(data.question_en) + "',''), pergunta_en), "
		+ "resposta_a_en = COALESCE(NULLIF('" + esc(data.answer_a_en) + "',''), resposta_a_en), "
		+ "resposta_b_en = COALESCE(NULLIF('" + esc(data.answer_b_en) + "',''), resposta_b_en), "
		+ "resposta_c_en = COALESCE(NULLIF('" + esc(data.answer_c_en) + "',''), resposta_c_en), "
		+ "resposta_d_en = COALESCE(NULLIF('" + esc(data.answer_d_en) + "',''), resposta_d_en), "
		+ "pergunta_pa = COALESCE(NULLIF('" + esc(data.question_pa) + "',''), pergunta_pa), "
		+ "resposta_a_pa = COALESCE(NULLIF('" + esc(data.answer_a_pa) + "',''), resposta_a_pa), "
		+ "resposta_b_pa = COALESCE(NULLIF('" + esc(data.answer_b_pa) + "',''), resposta_b_pa), "
		+ "resposta_c_pa = COALESCE(NULLIF('" + esc(data.answer_c_pa) + "',''), resposta_c_pa), "
		+ "resposta_d_pa = COALESCE(NULLIF('" + esc(data.answer_d_pa) + "',''), resposta_d_pa), "
		+ "explicacao_pt = '" + esc(data.explanation_pt) + "', "
		+ "explicacao_en = '" + esc(data.explanation_en) + "', "
		+ "explicacao_pa = '" + esc(data.explanation_pa) + "', "
		+ "explicacao_ok = 1 "
		+ "WHERE id = " + qid;
	await window.db.exec(query,'run');
	return true;
}

async function getQuestionsPA(ids)
{
	/* Traduções Punjabi das perguntas cargadas (una sola query) */
	var query = "SELECT id, pergunta_pa, resposta_a_pa, resposta_b_pa, resposta_c_pa, resposta_d_pa FROM perguntas WHERE id IN (" + ids + ")";
	var results = await window.db.exec(query,'get');
	return results;
}

async function getQuestionAIStates(ids)
{
	/* Estado da explicação de várias perguntas de uma vez (pre-fill e chips).
	   ids = "1,2,3..." -> devolve linhas {id, explicacao_*, explicacao_ok}. */
	var query = "SELECT id, explicacao_pt, explicacao_en, explicacao_pa, explicacao_ok FROM perguntas WHERE id IN (" + ids + ")";
	var results = await window.db.exec(query,'get');
	return results;
}