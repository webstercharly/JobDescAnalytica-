const natural = require('natural');
const jobDescriptions = [];

const stopWords = [
  'and',
  'for',
  'is',
  'of',
  'the',
  'to',
  'will',
  'have',
  'in',
  'this',
  'we',
  'at',
  'also',
  'as',
  'our',
  'work',
  'that',
  'be',
  'can',
  'you',
  'with'
];
const filterTags = ['Prep(voor)'];

const wordnet = {
  noun: ['NN', 'NNS', 'NNP', 'NNPS'],
  verb: ['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ'],
  adjective: ['JJ', 'JJR', 'JJS'],
  adverb: ['RB', 'RBR', 'RBS'],
};

const getPos = (tag) => {
  for (const pos in wordnet) {
    if (wordnet[pos].indexOf(tag) !== -1) {
      return pos;
    }
  }
  return null;
};

const wordnetLemmatizer = (word, tag) => {
  const pos = getPos(tag);
  if (pos === 'noun') {
    return word;
  } else if (pos === 'verb') {
    if (word.endsWith('s')) {
      return word.slice(0, -1);
    }
    return word;
  } else if (pos === 'adjective') {
    if (word.endsWith('er')) {
      return word.slice(0, -2);
    }
    if (word.endsWith('est')) {
      return word.slice(0, -3);
    }
    return word;
  } else if (pos === 'adverb') {
    if (word.endsWith('ly')) {
      return word.slice(0, -2);
    }
    return word;
  }
  return word;
};

const tokenizer = new natural.TreebankWordTokenizer();
const lexicon = new natural.Lexicon();
const ruleSet = new natural.RuleSet();
const brillPOSTagger = new natural.BrillPOSTagger(lexicon, ruleSet);
const stemmer = natural.PorterStemmer;

const preprocessedDescriptions = jobDescriptions.map((jobDescription) => {
  const cleanedDescription = jobDescription.replace(/[^\w\s]/gi, ''); // remove punctuation
  const tokens = tokenizer.tokenize(cleanedDescription);
  const taggedTokens = brillPOSTagger.tag(tokens).taggedWords;
  const filtered = taggedTokens
    .filter((taggedToken) => !stopWords.includes(taggedToken.token.toLowerCase()))
    .filter((taggedToken) => !filterTags.includes(taggedToken.tag));
  const stemmedWords = filtered.map((taggedToken) =>
    stemmer.stem(taggedToken.token),
  );
  const taggedStems = brillPOSTagger.tag(stemmedWords).taggedWords;
  const processedWords = taggedStems.map((taggedStem) =>
    wordnetLemmatizer(taggedStem.token, taggedStem.tag),
  );
  return processedWords;
});

const jobKeywords = preprocessedDescriptions.map((description) => {
  const keywordCounts = {};
  description.forEach((token) => {
    if (keywordCounts[token]) {
      keywordCounts[token] += 1;
    } else {
      keywordCounts[token] = 1;
    }
  });
  return keywordCounts;
});

const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a ** 2, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b ** 2, 0));
  if (normA === 0 || normB === 0) {
    return 0;
  }
  const similarity = dotProduct / (normA * normB);
  const rounded = Math.round(similarity * 100) / 100;
  return isNaN(similarity) ? 0 : rounded;
};

const euclideanDistance = (vecA, vecB) => {
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += (vecA[i] - vecB[i]) ** 2;
  }
  return isNaN(sum) ? 100 : Math.sqrt(sum);
};

const tfIdfScores = jobKeywords.map((keywords) => {
  const keywordIds = Object.keys(keywords);
  const docCount = jobKeywords.length;

  return keywordIds.map((keywordId) => {
    const keywordDocCount = jobKeywords.filter(
      (keyword) => keyword[keywordId],
    ).length;
    return keywords[keywordId] * Math.log(docCount / keywordDocCount);
  });
});

const similarityMatrix = [];
const similarityMatrixEuclidean = [];
for (let i = 0; i < tfIdfScores.length; i++) {
  similarityMatrix[i] = [];
  similarityMatrixEuclidean[i] = [];
  for (let j = 0; j < tfIdfScores.length; j++) {
    similarityMatrix[i][j] = cosineSimilarity(tfIdfScores[i], tfIdfScores[j]);
    similarityMatrixEuclidean[i][j] = euclideanDistance(tfIdfScores[i], tfIdfScores[j]);
  }
}

const jaccardSimilarity = (setA, setB) => {
  const union = new Set([...setA, ...setB]);
  const intersection = new Set([...setA].filter(x => setB.includes(x)));
  const similarity = intersection.size / union.size;
  const rounded = Math.round(similarity * 100) / 100;
  return isNaN(similarity) ? 0 : rounded;
};


const similarityScores = [];
for (let i = 0; i < preprocessedDescriptions.length; i++) {
  for (let j = i + 1; j < preprocessedDescriptions.length; j++) {
    similarityScores.push({
      job1: i,
      job2: j,
      similarity: jaccardSimilarity(
        preprocessedDescriptions[i],
        preprocessedDescriptions[j]
      ),
    });
  }
}

jobDescriptions.forEach((jobDescription, i) => {
  console.log(`cosineSimilarity ${(i)}:`);
  similarityMatrix[i].forEach((similarity, j) => {
    console.log(` (${j}) - (${similarity})`);
  });
  console.log('\n');

  console.log(`jaccardSimilarity ${(i)}:`);
  const scores = similarityScores.filter(score => score.job1 === i || score.job2 === i);
  scores.forEach(score => {
    if(score.job1 === i) {
      console.log(` (${score.job2}) - (${score.similarity})`);
    }
    else {
      console.log(` (${score.job1}) - (${score.similarity})`);
    }
  })
  console.log('\n');

  console.log(`euclideanDistance ${i}:`);
  similarityMatrixEuclidean[i].forEach((similarity, j) => {
    console.log(` (${j}) - (${similarity})`);
  });
  console.log('\n');

});
