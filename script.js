let activeTooltip = null;
let selectedEthics = [];
let ethicPoints = 3;
let selectedTraditions = new Array(5).fill(null);
let activeTraditionSlot = null;
let lastClickTime = 0;
let previousState = null;
let debounceTimer;

// Handle tradition search
function handleTraditionSearch() {
  const searchTerm = document.getElementById('traditionSearchInput').value.toLowerCase();

  // Reset all search dots
  document.querySelectorAll('.search-dot').forEach(dot => {
    dot.style.display = 'none';
  });

  if (searchTerm.length === 0) return;

  // Check each category for matching traditions
  traditionData.forEach((category, categoryIndex) => {
    const hasMatch = category.traditions.some(tradition =>
      tradition.name.toLowerCase().includes(searchTerm)
    );

    if (hasMatch) {
      const tabBtn = document.querySelector(`.tradition-tab-btn[data-index="${categoryIndex}"]`);
      const searchDot = tabBtn.querySelector('.search-dot');
      searchDot.style.display = 'block';
    }
  });
}

function saveState() {
  previousState = generateCultureData();
}

function undo() {
  if (previousState) {
    populateForm(previousState);
    showNotification('Undo successful!', 1500);
  }
}

// Initialize the culture creator
function init() {
  createEthosGrid();
  setupEventListeners();
  setupCustomDropdowns();
  setupLabelTooltips();
  setupTraditionSlots();
  setupTraditionTabs();
  updateEthicPointsTracker();
  loadFromLocalStorage();
}

function debounce(func, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, delay);
}

function saveToLocalStorage() {
  debounce(() => {
    saveState();
    const cultureData = generateCultureData();
    localStorage.setItem('fantasyCultureCreatorData', JSON.stringify(cultureData));
    showNotification('Progress saved automatically!', 1500);
  }, 1000);
}

function exportToLink() {
  const cultureData = generateCultureData();
  const serializedData = btoa(JSON.stringify(cultureData));
  const url = new URL(window.location.href);
  url.searchParams.set('culture', serializedData);
  prompt("Copy this link to share your culture:", url.href);
}

function importFromLink() {
  const url = prompt("Please enter the link you want to import from:");
  if (url) {
    try {
      const urlParams = new URLSearchParams(new URL(url).search);
      const cultureDataString = urlParams.get('culture');
      if (cultureDataString) {
        const cultureData = JSON.parse(atob(cultureDataString));
        populateForm(cultureData);
        showNotification('Loaded culture from shared link!');
      } else {
        showNotification('No culture data found in the provided link.', 4000);
      }
    } catch (e) {
      console.error('Error parsing culture data from URL', e);
      showNotification('Could not load culture from the provided link.', 4000);
    }
  }
}

function loadFromLocalStorage() {
  const urlParams = new URLSearchParams(window.location.search);
  const cultureDataString = urlParams.get('culture');

  if (cultureDataString) {
    try {
      const cultureData = JSON.parse(atob(cultureDataString));
      populateForm(cultureData);
      showNotification('Loaded culture from shared link!');
      // Clear the URL parameter to avoid confusion
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error('Error parsing culture data from URL', e);
      showNotification('Could not load culture from shared link.', 4000);
      // Fallback to local storage if URL parsing fails
      const savedData = localStorage.getItem('fantasyCultureCreatorData');
      if (savedData) {
        const cultureData = JSON.parse(savedData);
        populateForm(cultureData);
        showNotification('Loaded saved progress!');
      }
    }
  } else {
    const savedData = localStorage.getItem('fantasyCultureCreatorData');
    if (savedData) {
      const cultureData = JSON.parse(savedData);
      populateForm(cultureData);
      showNotification('Loaded saved progress!');
    }
  }
}

function populateForm(cultureData) {
  clearAllOptions();

  document.getElementById('cultureName').value = cultureData.name;
  document.getElementById('culturePlural').value = cultureData.plural;
  document.getElementById('cultureAdjective').value = cultureData.adjective;
  document.getElementById('divergedFrom').value = cultureData.divergedFrom;
  document.getElementById('divergenceYear').value = cultureData.divergenceYear;
  document.getElementById('languageName').value = cultureData.languageName;
  document.getElementById('exampleNames').value = cultureData.exampleNames;
  document.getElementById('cultureBiography').value = cultureData.cultureBiography;

  // Set Ethics
  cultureData.ethics.forEach(ethic => {
    const ethicData = ethosData.find(e => e.title === ethic.title);
    const ethosBox = document.querySelector(`.ethos-box[data-index="${ethosData.indexOf(ethicData)}"]`);
    if (ethicData && ethosBox) {
      handleEthicClick(ethicData, ethosBox);
      if (ethic.fanatic) {
        handleEthicClick(ethicData, ethosBox);
      }
    }
  });

  // Set Dropdowns
  for (const key in cultureData) {
    if (key === 'ethics' || key === 'traditions') continue;
    const dropdown = document.getElementById(`${key}-dropdown`);
    if (dropdown) {
      selectDropdownOption(dropdown, null, cultureData[key]);
    }
  }

  // Set Traditions
  const allTraditions = traditionData.flatMap(cat => cat.traditions);
  cultureData.traditions.forEach((traditionName, i) => {
    if (i < 5) {
      const tradition = allTraditions.find(t => t.name === traditionName.name);
      if (tradition) selectedTraditions[i] = tradition;
    }
  });
  updateTraditionSlots();
  updateTraditionAvailability();
}

function updateEthicPointsTracker() {
  document.getElementById('ethosPointsTracker').textContent = `Points Remaining: ${ethicPoints}`;
}

// Create ethos grid
function createEthosGrid() {
  const grid = document.getElementById('ethosGrid');
  grid.innerHTML = '';
  ethosData.forEach((ethos, index) => {
    const box = document.createElement('div');
    box.className = 'ethos-box';
    box.dataset.index = index;

    box.innerHTML = `
                    <span class="ethos-icon">${ethos.emoji}</span>
                    <h3 class="ethos-title-text">${ethos.title}</h3>
                `;
    box.addEventListener('mouseenter', (e) => showTooltip(e, ethos));
    box.addEventListener('mouseleave', () => hideTooltip());
    box.addEventListener('click', (e) => {
      handleEthicClick(ethos, box);
    });
    grid.appendChild(box);
  });
}
// Clear all options
function clearAllOptions() {
  saveState();
  // Clear all input fields
  document.getElementById('cultureName').value = '';
  document.getElementById('culturePlural').value = '';
  document.getElementById('cultureAdjective').value = '';
  document.getElementById('divergedFrom').value = '';
  document.getElementById('divergenceYear').value = '';
  document.getElementById('languageName').value = '';
  document.getElementById('exampleNames').value = '';
  document.getElementById('cultureBiography').value = '';

  // Reset all custom dropdowns
  const dropdowns = document.querySelectorAll('.custom-dropdown');
  dropdowns.forEach(dropdown => {
    const selected = dropdown.querySelector('.dropdown-selected span:first-child');
    const optionElements = dropdown.querySelectorAll('.dropdown-option');

    let placeholder = 'Select option';
    if (dropdown.id.includes('examples')) placeholder = 'Culture Examples';
    else if (dropdown.id.includes('heritage')) placeholder = 'Select heritage location';
    else if (dropdown.id.includes('era')) placeholder = 'Select era';
    else if (dropdown.id.includes('species')) placeholder = 'Select species';

    selected.textContent = placeholder;

    optionElements.forEach(opt => opt.classList.remove('selected'));
    dropdown.removeAttribute('data-value');
  });

  document.querySelectorAll('.ethos-box').forEach(box => {
    box.classList.remove('selected', 'fanatic');
    const titleEl = box.querySelector('.ethos-title-text');
    const originalTitle = ethosData[parseInt(box.dataset.index)].title;
    if (titleEl.textContent.startsWith('Fanatic')) {
      titleEl.textContent = originalTitle;
    }
  });
  selectedEthics = [];
  ethicPoints = 3;
  updateEthicPointsTracker();

  selectedTraditions.fill(null);
  updateTraditionSlots();
  updateTraditionAvailability();
}

// Fill in blanks function
function fillInBlanks() {
  saveState();
  // Fill dropdowns that haven't been selected
  document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    if (dropdown.id === 'examples-dropdown') return;

    if (!dropdown.hasAttribute('data-value')) {
      const options = dropdown.querySelectorAll('.dropdown-option');
      if (options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        selectDropdownOption(dropdown, randomOption);
      }
    }
  });

  // Fill ethics if none selected
  if (selectedEthics.length === 0) {
    let availableEthics = [...ethosData];
    let ethicsToSelect = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < ethicsToSelect; i++) {
      if (availableEthics.length === 0) break;
      const randomEthosIndex = Math.floor(Math.random() * availableEthics.length);
      const selectedEthos = availableEthics[randomEthosIndex];
      const ethosBox = document.querySelector(`.ethos-box[data-index="${ethosData.indexOf(selectedEthos)}"]`);
      handleEthicClick(selectedEthos, ethosBox, false);
      availableEthics = availableEthics.filter(e => e.title !== selectedEthos.title && !selectedEthos.opposites.includes(e.title));
    }
  }

  // Fill traditions if none selected
  const emptySlots = selectedTraditions.filter(t => t === null).length;
  if (emptySlots > 0) {
    let availableTraditions = traditionData.flatMap(c => c.traditions).filter(t => !selectedTraditions.some(st => st && st.name === t.name));
    for (let i = 0; i < selectedTraditions.length; i++) {
      if (selectedTraditions[i] === null && availableTraditions.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableTraditions.length);
        const selectedTradition = availableTraditions.splice(randomIndex, 1)[0];
        selectedTraditions[i] = selectedTradition;
        availableTraditions = availableTraditions.filter(t => t.name !== selectedTradition.opposite && t.opposite !== selectedTradition.name);
      }
    }
    updateTraditionSlots();
    updateTraditionAvailability();
  }

  // Fill divergence year if era is selected but year is not
  const eraValue = document.getElementById('era-dropdown').getAttribute('data-value');
  const yearInput = document.getElementById('divergenceYear');
  if (eraValue && !yearInput.value) {
    yearInput.value = (eraValue === 'btu')
      ? -Math.floor(Math.random() * 12000) - 1
      : Math.floor(Math.random() * 948) + 1;
  }
}

// Clear all traditions function
function clearAllTraditions() {
  selectedTraditions.fill(null);
  updateTraditionSlots();
  updateTraditionAvailability();
}

// Import from file function
function importFromFile() {
  document.getElementById('fileInput').click();
}

// Handle file import
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      parseCultureFile(content);
    } catch (error) {
      showNotification('Error reading file: ' + error.message);
    }
  };
  reader.readAsText(file);
}

// Parse culture file and populate form
function parseCultureFile(content) {
  clearAllOptions();

  const lines = content.split('\n');

  // Parse basic information
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('Culture Name:')) {
      document.getElementById('cultureName').value = line.split(':')[1].trim();
    } else if (line.startsWith('Plural Form:') && !line.includes('Not specified')) {
      document.getElementById('culturePlural').value = line.split(':')[1].trim();
    } else if (line.startsWith('Adjective Form:') && !line.includes('Not specified')) {
      document.getElementById('cultureAdjective').value = line.split(':')[1].trim();
    } else if (line.startsWith('Diverged From:') && !line.includes('Not specified')) {
      document.getElementById('divergedFrom').value = line.split(':')[1].trim();
    } else if (line.startsWith('Year of Divergence:') && !line.includes('Unknown')) {
      document.getElementById('divergenceYear').value = line.split(':')[1].trim();
    } else if (line.startsWith('Language Name:') && !line.includes('Not specified')) {
      document.getElementById('languageName').value = line.split(':')[1].trim();
    }
  }

  // Parse ethics
  const ethicsSection = content.match(/CULTURAL ETHICS\n-{20}\n([\s\S]*?)(?=\n\n[A-Z])/);
  if (ethicsSection) {
    const ethicsText = ethicsSection[1];
    const ethicLines = ethicsText.split('\n').filter(line => line.startsWith('•'));

    ethicLines.forEach(line => {
      const ethicName = line.replace('•', '').replace('FANATIC', '').trim().split('\n')[0];
      const isFanatic = line.includes('FANATIC');
      const ethic = ethosData.find(e => e.title.toUpperCase() === ethicName);
      if (ethic) {
        const ethosBox = document.querySelector(`.ethos-box[data-index="${ethosData.indexOf(ethic)}"]`);
        handleEthicClick(ethic, ethosBox, false);
        if (isFanatic) {
          handleEthicClick(ethic, ethosBox, false); // Click again for fanatic
        }
      }
    });
  }

  // Parse dropdowns by extracting values after colons
  const dropdownMappings = {
    'Heritage Location:': 'heritage-dropdown',
    'Martial Gender:': 'martialGender-dropdown',
    'Intercultural Relations:': 'interculturalRelations-dropdown',
    'Legal Foundation:': 'legalFoundation-dropdown',
    'Knowledge Transmission:': 'knowledgeTransmission-dropdown',
    'Magic Stance:': 'magicStance-dropdown',
    'Magic Type:': 'magicType-dropdown',
    'Architecture:': 'architecture-dropdown',
    'Artworks:': 'artworks-dropdown',
    'Music & Performances:': 'musicPerformances-dropdown',
    'Cuisine & Dining:': 'cuisineDining-dropdown',
    'Clothing Materials:': 'clothingMaterials-dropdown',
    'Garment Types:': 'garmentTypes-dropdown',
    'Headwear:': 'headwear-dropdown',
    'Footwear:': 'footwear-dropdown',
    'Jewelry & Accessories:': 'jewelry-accessories-dropdown',
    'Hairstyles:': 'hairstyles-dropdown',
    'Body Markings:': 'bodyMarkings-dropdown',
    'Scent & Perfume:': 'scentPerfume-dropdown'
  };

  for (const [key, dropdownId] in Object.entries(dropdownMappings)) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\$&') + '\s*(.+)');
    const match = content.match(regex);
    if (match && !match[1].includes('Not specified')) {
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        const value = match[1].trim();
        // Find matching option by title text
        const option = Array.from(dropdown.querySelectorAll('.dropdown-option')).find(opt => {
          const title = opt.querySelector('.option-title');
          return title && title.textContent.trim() === value;
        });
        if (option) {
          selectDropdownOption(dropdown, option);
        }
      }
    }
  }

  // Parse traditions
  const traditionsSection = content.match(/CULTURAL TRADITIONS\n-{20}\n([\s\S]*?)(?=\n\n[A-Z])/);
  if (traditionsSection) {
    const traditionsText = traditionsSection[1];
    const traditionLines = traditionsText.split('\n').filter(line => /^\d+\./.test(line.trim()));

    const allTraditions = traditionData.flatMap(cat => cat.traditions);
    traditionLines.forEach((line, index) => {
      if (index < 5) {
        const traditionName = line.replace(/^\d+\.\s*/, '').trim();
        const tradition = allTraditions.find(t => t.name === traditionName);
        if (tradition) {
          selectedTraditions[index] = tradition;
        }
      }
    });
    updateTraditionSlots();
    updateTraditionAvailability();
  }

  // Parse example names and biography
  const exampleNamesMatch = content.match(/EXAMPLE NAMES\n-{20}\n([\s\S]*?)(?=\n\n[A-Z])/);
  if (exampleNamesMatch) {
    document.getElementById('exampleNames').value = exampleNamesMatch[1].trim();
  }

  const biographyMatch = content.match(/CULTURE BIOGRAPHY\n-{20}\n([\s\S]*?)(?=\nGenerated on:)/);
  if (biographyMatch) {
    document.getElementById('cultureBiography').value = biographyMatch[1].trim();
  }
}
// Randomize all options
function randomizeAllOptions() {
  saveState();
  clearAllOptions();
  const ethosBoxes = document.querySelectorAll('.ethos-box');
  // Randomize ethics
  let ethicsToSelect = Math.floor(Math.random() * 3) + 1;
  for (let i = 0; i < ethicsToSelect; i++) {
    const randomEthosIndex = Math.floor(Math.random() * ethosData.length);
    handleEthicClick(ethosData[randomEthosIndex], ethosBoxes[randomEthosIndex], false);
  }

  document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    if (dropdown.id === 'examples-dropdown') return;
    const options = dropdown.querySelectorAll('.dropdown-option');
    if (options.length > 0) {
      const randomOption = options[Math.floor(Math.random() * options.length)];
      selectDropdownOption(dropdown, randomOption);
    }
  });

  randomizeTraditions();

  const eraValue = document.getElementById('era-dropdown').getAttribute('data-value');
  document.getElementById('divergenceYear').value = (eraValue === 'btu')
    ? -Math.floor(Math.random() * 12000) - 1
    : Math.floor(Math.random() * 948) + 1;
}

function randomizeTraditions() {
  saveState();
  const allTraditions = traditionData.flatMap(cat => cat.traditions);
  selectedTraditions.fill(null);
  for (let i = 0; i < 5; i++) {
    if (allTraditions.length === 0) break;
    const randomIndex = Math.floor(Math.random() * allTraditions.length);
    selectedTraditions[i] = allTraditions.splice(randomIndex, 1)[0];
  }
  updateTraditionSlots();
  updateTraditionAvailability();
}

// Helper function to select a dropdown option
function selectDropdownOption(dropdown, option, value) {
  const selected = dropdown.querySelector('.dropdown-selected span:first-child');
  const optionElements = dropdown.querySelectorAll('.dropdown-option');

  let targetOption = option;
  if (value) {
    targetOption = dropdown.querySelector(`.dropdown-option[data-value="${value}"]`);
  }

  if (!targetOption) return;

  const title = targetOption.querySelector('.option-title') ? targetOption.querySelector('.option-title').textContent : targetOption.textContent;
  selected.textContent = title;

  optionElements.forEach(opt => opt.classList.remove('selected'));
  targetOption.classList.add('selected');

  const dataValue = targetOption.getAttribute('data-value');
  dropdown.setAttribute('data-value', dataValue);
  dropdown.dispatchEvent(new Event('change'));
}

// --- New Ethics Logic ---
function handleEthicClick(ethos, box) {
  saveState();
  const ethicIndex = selectedEthics.findIndex(e => e.title === ethos.title);
  const isSelected = ethicIndex > -1;
  const currentEthic = isSelected ? selectedEthics[ethicIndex] : null;

  // Check for opposites
  const hasOppositeSelected = selectedEthics.some(se => ethos.opposites.includes(se.title));

  if (isSelected) {
    // It's already selected, let's see if we can make it fanatic
    if (!currentEthic.fanatic && ethicPoints >= 1) {
      // Upgrade to Fanatic
      ethicPoints -= 1;
      currentEthic.fanatic = true;
      currentEthic.cost = 2;
    } else {
      // Deselect (either was fanatic or couldn't upgrade)
      ethicPoints += currentEthic.cost;
      selectedEthics.splice(ethicIndex, 1);
    }
  } else {
    // Not selected, let's try to select it
    const cost = hasOppositeSelected ? 2 : 1;
    if (ethicPoints >= cost && selectedEthics.length < 3) {
      ethicPoints -= cost;
      selectedEthics.push({ ...ethos,
        fanatic: false,
        cost: cost
      });
    }
  }

  updateEthosUI();
  updateEthicPointsTracker();
}

function updateEthosUI() {
  document.querySelectorAll('.ethos-box').forEach(box => {
    const ethosTitle = ethosData[parseInt(box.dataset.index)].title;
    const ethic = selectedEthics.find(e => e.title === ethosTitle);
    const titleEl = box.querySelector('.ethos-title-text');

    if (ethic) {
      box.classList.add('selected');
      if (ethic.fanatic) {
        box.classList.add('fanatic');
        titleEl.textContent = `Fanatic ${ethic.title}`;
      } else {
        box.classList.remove('fanatic');
        titleEl.textContent = ethic.title;
      }
    } else {
      box.classList.remove('selected', 'fanatic');
      titleEl.textContent = ethosTitle;
    }
  });
}


// Show tooltip
function showTooltip(event, ethos) {
  if (activeTooltip) activeTooltip.remove();
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = `
                <div class="tooltip-header">
                    <h3 class="tooltip-title">${ethos.emoji} ${ethos.title}</h3>
                </div>
                <div class="tooltip-content"><p>${ethos.description}</p></div>
            `;
  document.body.appendChild(tooltip);
  positionTooltip(event, tooltip);
  activeTooltip = tooltip;
  setTimeout(() => {
    if (tooltip && tooltip.parentNode) tooltip.classList.add('active');
  }, 10);
}
// Show dropdown tooltip
function showDropdownTooltip(event, title, text) {
  if (activeTooltip) activeTooltip.remove();
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = `
                <div class="tooltip-header"><h3 class="tooltip-title">${title}</h3></div>
                <div class="tooltip-content"><p>${text}</p></div>
            `;
  document.body.appendChild(tooltip);
  positionTooltip(event, tooltip);
  activeTooltip = tooltip;
  setTimeout(() => {
    if (tooltip && tooltip.parentNode) tooltip.classList.add('active');
  }, 10);
}

function showButtonTooltip(event, title, text) {
  if (activeTooltip) activeTooltip.remove();
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.innerHTML = `
                <div class="tooltip-header"><h3 class="tooltip-title">${title}</h3></div>
                <div class="tooltip-content"><p>${text}</p></div>
            `;
  document.body.appendChild(tooltip);
  positionTooltip(event, tooltip);
  activeTooltip = tooltip;
  setTimeout(() => {
    if (tooltip && tooltip.parentNode) tooltip.classList.add('active');
  }, 10);
}

// Position tooltip at mouse coordinates
function positionTooltip(event, tooltip) {
  const tooltipRect = tooltip.getBoundingClientRect();
  const tooltipWidth = tooltipRect.width || 350;
  const tooltipHeight = tooltipRect.height || 200;
  let left = event.clientX + 15;
  let top = event.clientY + 15;
  if (left + tooltipWidth > window.innerWidth) left = event.clientX - tooltipWidth - 15;
  if (top + tooltipHeight > window.innerHeight) top = event.clientY - tooltipHeight - 15;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}
// Hide tooltip
function hideTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}
// Setup event listeners
function setupEventListeners() {
  document.addEventListener('click', (e) => {
    if (activeTooltip && !activeTooltip.contains(e.target) && !e.target.closest('.ethos-box, .label-help, .clothing-help')) {
      hideTooltip();
    }
    if (!e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.dropdown-options.open').forEach(options => options.classList.remove('open'));
      document.querySelectorAll('.dropdown-arrow.open').forEach(arrow => arrow.classList.remove('open'));
    }
  });

  document.querySelectorAll('input, textarea').forEach(element => {
    element.addEventListener('input', saveToLocalStorage);
  });

  document.querySelectorAll('.custom-dropdown').forEach(element => {
    element.addEventListener('change', saveToLocalStorage);
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      undo();
    }
  });

  const buttonTooltips = {
    'auto-generate-btn': {
      title: 'Auto-Generate Plural and Adjective',
      text: 'Automatically generate a plural and adjective form of the culture name.'
    },
    'randomize-btn': {
      title: 'Randomize All',
      text: 'Randomize all options in the creator.'
    },
    'clear-btn': {
      title: 'Clear All',
      text: 'Clear all selected options.'
    },
    'fill-in-blanks-btn': {
      title: 'Fill in Blanks',
      text: 'Fill in any blank fields with random selections.'
    },
    'generate-btn': {
      title: 'Save as TXT',
      text: 'Save the culture as a TXT file.'
    },
    'png-btn': {
      title: 'Save as PNG',
      text: 'Save the current view as a PNG image.'
    },
    'import-from-file-btn': {
      title: 'Import from TXT',
      text: 'Import a culture from a TXT file.'
    },
    'import-from-link-btn': {
      title: 'Import from link',
      text: 'Import a culture from a shared link.'
    },
    'export-to-link-btn': {
      title: 'Export to link',
      text: 'Export the current culture to a shareable link.'
    }
  };

  for (const btnClass in buttonTooltips) {
    const btn = document.querySelector(`.${btnClass}`);
    if (btn) {
      btn.addEventListener('mouseenter', (e) => showButtonTooltip(e, buttonTooltips[btnClass].title, buttonTooltips[btnClass].text));
      btn.addEventListener('mouseleave', hideTooltip);
    }
  }
}
// Setup custom dropdowns
function setupCustomDropdowns() {
  document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    const selected = dropdown.querySelector('.dropdown-selected');
    const options = dropdown.querySelector('.dropdown-options');
    const arrow = dropdown.querySelector('.dropdown-arrow');

    selected.addEventListener('mouseenter', (e) => {
      const value = dropdown.getAttribute('data-value');
      if (value) {
        const option = dropdown.querySelector(`.dropdown-option[data-value="${value}"]`);
        if (option) {
          const title = option.querySelector('.option-title').textContent;
          const description = option.querySelector('.option-description').textContent;
          showDropdownTooltip(e, title, description);
        }
      }
    });
    selected.addEventListener('mouseleave', hideTooltip);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'dropdown-search';
    searchInput.placeholder = 'Search...';
    searchInput.addEventListener('click', e => e.stopPropagation());
    options.insertBefore(searchInput, options.firstChild);

    searchInput.addEventListener('input', () => {
      const filter = searchInput.value.toLowerCase();
      options.querySelectorAll('.dropdown-option').forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(filter) ? '' : 'none';
      });
    });

    selected.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = options.classList.contains('open');
      document.querySelectorAll('.dropdown-options.open').forEach(opt => opt.classList.remove('open'));
      document.querySelectorAll('.dropdown-arrow.open').forEach(arr => arr.classList.remove('open'));
      if (!isOpen) {
        options.classList.add('open');
        if (arrow) arrow.classList.add('open');
        searchInput.value = '';
        options.querySelectorAll('.dropdown-option').forEach(option => {
          option.style.display = '';
        });
        searchInput.focus();
      }
    });

    options.querySelectorAll('.dropdown-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.id === 'examples-dropdown') {
          applyCultureExample(option.dataset.value);
        } else {
          selectDropdownOption(dropdown, option);
        }
        options.classList.remove('open');
        if (arrow) arrow.classList.remove('open');
      });
    });
  });
}

// Setup tooltips
function setupLabelTooltips() {
  document.querySelectorAll('.label-help, .clothing-help').forEach(button => {
    const title = button.previousElementSibling.textContent;
    button.addEventListener('mouseenter', (e) => showDropdownTooltip(e, title, button.dataset.tooltip));
    button.addEventListener('mouseleave', hideTooltip);
  });
}

// Cultural Traditions Logic
function setupTraditionSlots() {
  const container = document.getElementById('traditionSlotsContainer');
  container.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'tradition-slot';
    slot.dataset.index = i;
    slot.addEventListener('click', () => {
      if (!selectedTraditions[i]) {
        addRandomTraditionToSlot(i);
      } else {
        setActiveTraditionSlot(i)
      }
    });
    container.appendChild(slot);
  }
  updateTraditionSlots();
}

function updateTraditionSlots() {
  document.querySelectorAll('.tradition-slot').forEach((slot, index) => {
    const tradition = selectedTraditions[index];
    if (tradition) {
      // Find which category this tradition belongs to
      const category = traditionData.find(cat =>
        cat.traditions.some(t => t.name === tradition.name)
      );

      const categoryClass = getCategoryClass(category?.name);

      slot.innerHTML = `
                        <button class="remove-tradition-btn" onclick="removeTradition(event, ${index})">×</button>
                        <div class="tradition-emoji">${tradition.emoji}</div>
                        <div class="tradition-name">${tradition.name}</div>
                        <div class="tradition-description-card">${tradition.description}</div>
                    `;
      slot.className = 'tradition-slot selected';
      if (categoryClass) slot.classList.add(categoryClass);
    } else {
      slot.innerHTML = '<div class="plus-icon">+</div>';
      slot.classList.remove('selected', 'military-defense', 'social-governance', 'economy-resources', 'arts-craftsmanship', 'spiritual-knowledge', 'environment-lifestyle');
      slot.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      slot.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    }
  });
}

function setActiveTraditionSlot(index) {
  activeTraditionSlot = index;
  document.querySelectorAll('.tradition-slot').forEach((slot, i) => {
    const tradition = selectedTraditions[i];
    if (i === index) {
      slot.style.borderColor = '#f39c12';
      slot.style.boxShadow = '0 0 20px rgba(243, 156, 18, 0.5)';
    } else {
      slot.style.borderColor = tradition ? tradition.color : 'rgba(255, 255, 255, 0.2)';
      slot.style.boxShadow = tradition ? `0 0 20px ${tradition.color}55` : '0 4px 15px rgba(0,0,0,0.2)';
    }
  });
}

function removeTradition(event, index) {
  saveState();
  event.stopPropagation();
  selectedTraditions[index] = null;
  updateTraditionSlots();
  updateTraditionAvailability();
}

function addRandomTraditionToSlot(index) {
  saveState();
  const availableTraditions = traditionData.flatMap(c => c.traditions).filter(t => !selectedTraditions.some(st => st && st.name === t.name));
  if (availableTraditions.length > 0) {
    const randomTradition = availableTraditions[Math.floor(Math.random() * availableTraditions.length)];
    selectedTraditions[index] = randomTradition;
    updateTraditionSlots();
    updateTraditionAvailability();
  }
}

function setupTraditionTabs() {
  const navContainer = document.getElementById('traditionTabsNav');
  const contentContainer = document.getElementById('traditionTabContentContainer');
  navContainer.innerHTML = '';
  contentContainer.innerHTML = '';

  const categoryClasses = [
    'military-defense',
    'social-governance',
    'economy-resources',
    'arts-craftsmanship',
    'spiritual-knowledge',
    'environment-lifestyle'
  ];

  traditionData.forEach((category, index) => {
    const btn = document.createElement('button');
    btn.className = `tradition-tab-btn ${categoryClasses[index]}`;
    btn.dataset.index = index;
    btn.innerHTML = `${category.emoji}<span class="tab-text">${category.name}</span><div class="search-dot"></div>`;
    btn.addEventListener('click', () => openTraditionTab(index));
    navContainer.appendChild(btn);

    const content = document.createElement('div');
    content.className = 'tradition-tab-content';
    content.id = `tab-content-${index}`;
    category.traditions.sort((a, b) => a.name.localeCompare(b.name)).forEach(tradition => {
      const item = document.createElement('div');
      item.className = 'tradition-item';
      item.dataset.name = tradition.name;
      item.innerHTML = `
                        <div class="tradition-item-header">
                            <span class="emoji">${tradition.emoji}</span>
                            <span>${tradition.name}</span>
                        </div>
                        <div class="tradition-item-description">${tradition.description}</div>
                    `;
      item.addEventListener('click', () => selectTradition(tradition));
      content.appendChild(item);
    });
    contentContainer.appendChild(content);
  });

  // Setup search functionality
  const searchInput = document.getElementById('traditionSearchInput');
  searchInput.addEventListener('input', handleTraditionSearch);

  openTraditionTab(0);
}

function openTraditionTab(index) {
  const tabBtn = document.querySelector(`.tradition-tab-btn[data-index="${index}"]`);
  const content = document.getElementById(`tab-content-${index}`);
  const isAlreadyActive = tabBtn.classList.contains('active');

  document.querySelectorAll('.tradition-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tradition-tab-content').forEach(c => c.classList.remove('active'));

  if (!isAlreadyActive) {
    tabBtn.classList.add('active');
    content.classList.add('active');
  }
}

function selectTradition(tradition) {
  saveState();
  if (selectedTraditions.some(t => t && t.name === tradition.name)) {
    return;
  }

  let slotToFill = -1;
  if (activeTraditionSlot !== null && !selectedTraditions[activeTraditionSlot]) {
    slotToFill = activeTraditionSlot;
  } else {
    slotToFill = selectedTraditions.findIndex(t => t === null);
  }

  if (slotToFill !== -1) {
    selectedTraditions[slotToFill] = tradition;
    updateTraditionSlots();
    updateTraditionAvailability();
    document.querySelectorAll('.tradition-slot').forEach(slot => {
      const currentTradition = selectedTraditions[parseInt(slot.dataset.index)];
      slot.style.borderColor = currentTradition ? currentTradition.color : 'rgba(255, 255, 255, 0.2)';
      slot.style.boxShadow = currentTradition ? `0 0 20px ${currentTradition.color}55` : '0 4px 15px rgba(0,0,0,0.2)';
    });
    activeTraditionSlot = null;
  } else {
    console.warn("All tradition slots are full.");
  }
}

function updateTraditionAvailability() {
  const selectedNames = selectedTraditions.filter(t => t).map(t => t.name);
  document.querySelectorAll('.tradition-item').forEach(item => {
    if (selectedNames.includes(item.dataset.name)) {
      item.classList.add('disabled');
    } else {
      item.classList.remove('disabled');
    }
  });
}

function getCategoryClass(categoryName) {
  const categoryClassMap = {
    'Military & Defense': 'military-defense',
    'Social & Governance': 'social-governance',
    'Economy & Resources': 'economy-resources',
    'Arts & Craftsmanship': 'arts-craftsmanship',
    'Spiritual & Knowledge': 'spiritual-knowledge',
    'Environment & Lifestyle': 'environment-lifestyle'
  };
  return categoryClassMap[categoryName] || '';
}

function exportPageAsPNG() {
  // Close tradition tabs for export
  document.querySelectorAll('.tradition-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tradition-tab-content').forEach(c => c.classList.remove('active'));

  // Create a script element to load html2canvas
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload = function() {
    // Wait a moment for any transitions to complete
    setTimeout(() => {
      // Get the full height of the document
      const fullHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );

      html2canvas(document.body, {
        backgroundColor: '#1a1a2e',
        scale: 0.8,
        useCORS: true,
        allowTaint: false,
        height: fullHeight,
        width: document.body.scrollWidth,
        scrollX: 0,
        scrollY: 0
      }).then(canvas => {
        // Create download link
        const link = document.createElement('a');
        link.download = `${document.getElementById('cultureName').value || 'Fantasy_Culture'}_Export.png`;
        link.href = canvas.toDataURL();
        link.click();
        showNotification('Culture saved as PNG!');
      }).catch(error => {
        console.error('Error exporting PNG:', error);
        showNotification('Error exporting PNG. Please try again.');

      });
    }, 300);
  };

  script.onerror = function() {
    showNotification('Failed to load export library. Please check your internet connection.');

  };

  document.head.appendChild(script);
}

function generatePluralAdjective() {
  const name = document.getElementById('cultureName').value;
  if (!name) return;
  const pluralInput = document.getElementById('culturePlural');
  const adjectiveInput = document.getElementById('cultureAdjective');

  if (name.endsWith('a')) {
    pluralInput.value = name.slice(0, -1) + 'ae';
    adjectiveInput.value = name + 'n';
  } else if (name.endsWith('us')) {
    pluralInput.value = name.slice(0, -2) + 'i';
    adjectiveInput.value = name.slice(0, -2) + 'an';
  } else if (name.endsWith('n') || name.endsWith('l')) {
    pluralInput.value = name + 's';
    adjectiveInput.value = name + 'ish';
  } else {
    pluralInput.value = name + 's';
    adjectiveInput.value = name + 'ian';
  }
}


// Generate culture data
function generateCultureData() {
  const cultureData = {
    name: document.getElementById('cultureName').value,
    plural: document.getElementById('culturePlural').value,
    adjective: document.getElementById('cultureAdjective').value,
    ethics: selectedEthics,
    divergedFrom: document.getElementById('divergedFrom').value,
    divergenceYear: document.getElementById('divergenceYear').value,
    era: document.getElementById('era-dropdown').dataset.value,
    species: document.getElementById('species-dropdown').dataset.value,
    heritage: document.getElementById('heritage-dropdown').dataset.value,
    martialGender: document.getElementById('martialGender-dropdown').dataset.value,
    interculturalRelations: document.getElementById('interculturalRelations-dropdown').dataset.value,
    legalFoundation: document.getElementById('legalFoundation-dropdown').dataset.value,
    languageName: document.getElementById('languageName').value,
    knowledgeTransmission: document.getElementById('knowledgeTransmission-dropdown').dataset.value,
    magicStance: document.getElementById('magicStance-dropdown').dataset.value,
    magicType: document.getElementById('magicType-dropdown').dataset.value,
    architecture: document.getElementById('architecture-dropdown').dataset.value,
    artworks: document.getElementById('artworks-dropdown').dataset.value,
    musicPerformances: document.getElementById('musicPerformances-dropdown').dataset.value,
    cuisineDining: document.getElementById('cuisineDining-dropdown').dataset.value,
    clothingMaterials: document.getElementById('clothingMaterials-dropdown').dataset.value,
    garmentTypes: document.getElementById('garmentTypes-dropdown').dataset.value,
    headwear: document.getElementById('headwear-dropdown').dataset.value,
    footwear: document.getElementById('footwear-dropdown').dataset.value,
    jewelryAccessories: document.getElementById('jewelry-accessories-dropdown').dataset.value,
    hairstyles: document.getElementById('hairstyles-dropdown').dataset.value,
    bodyMarkings: document.getElementById('bodyMarkings-dropdown').dataset.value,
    scentPerfume: document.getElementById('scentPerfume-dropdown').dataset.value,
    traditions: selectedTraditions.filter(t => t),
    exampleNames: document.getElementById('exampleNames').value,
    cultureBiography: document.getElementById('cultureBiography').value
  };

  return cultureData;
}



// Save culture to file
function saveCultureToFile() {
  const cultureData = generateCultureData();

  if (!cultureData.name || cultureData.ethics.length === 0) {
    showNotification('Please enter a culture name and select at least one ethic.');
    return;
  }

  // Create formatted text content
  let content = `# FANTASY CULTURE: ${cultureData.name.toUpperCase()}

`;

  // Basic Information
  content += `## BASIC INFORMATION
`;
  content += `**Culture Name:** ${cultureData.name}
`;
  content += `**Plural Form:** ${cultureData.plural || 'Not specified'}
`;
  content += `**Adjective Form:** ${cultureData.adjective || 'Not specified'}
`;
  content += `**Species:** ${getDropdownDisplayText('species', cultureData.species)}
`;
  if (cultureData.divergedFrom) {
    content += `**Diverged From:** ${cultureData.divergedFrom}
`;
    content += `**Year of Divergence:** ${cultureData.divergenceYear || 'Unknown'}
`;
    content += `**Era:** ${cultureData.era || 'Not specified'}
`;
  }
  content += '\n';

  // Cultural Ethics
  content += `## CULTURAL ETHICS
`;
  if (cultureData.ethics.length > 0) {
    cultureData.ethics.forEach(ethic => {
      content += `### ${ethic.fanatic ? 'FANATIC ' : ''}${ethic.title.toUpperCase()}
`;
      content += `${ethic.description}\n\n`;
    });
  } else {
    content += 'No ethics selected\n\n';
  }

  // Core Principles
  content += `## CORE PRINCIPLES
`;
  content += `**Heritage Location:** ${getDropdownDisplayText('heritage', cultureData.heritage)}
`;
  content += `**Martial Gender:** ${getDropdownDisplayText('martialGender', cultureData.martialGender)}
`;
  content += `**Intercultural Relations:** ${getDropdownDisplayText('interculturalRelations', cultureData.interculturalRelations)}
`;
  content += `**Legal Foundation:** ${getDropdownDisplayText('legalFoundation', cultureData.legalFoundation)}

`;

  // Language and Arcane
  content += `## LANGUAGE AND ARCANE
`;
  content += `**Language Name:** ${cultureData.languageName || 'Not specified'}
`;
  content += `**Knowledge Transmission:** ${getDropdownDisplayText('knowledgeTransmission', cultureData.knowledgeTransmission)}
`;
  content += `**Magic Stance:** ${getDropdownDisplayText('magicStance', cultureData.magicStance)}
`;
  content += `**Magic Type:** ${getDropdownDisplayText('magicType', cultureData.magicType)}

`;

  // Aesthetics
  content += `## AESTHETICS
`;
  content += `**Architecture:** ${getDropdownDisplayText('architecture', cultureData.architecture)}
`;
  content += `**Artworks:** ${getDropdownDisplayText('artworks', cultureData.artworks)}
`;
  content += `**Music & Performances:** ${getDropdownDisplayText('musicPerformances', cultureData.musicPerformances)}
`;
  content += `**Cuisine & Dining:** ${getDropdownDisplayText('cuisineDining', cultureData.cuisineDining)}

`;

  // Clothing & Appearance
  content += `## CLOTHING & APPEARANCE
`;
  content += `**Clothing Materials:** ${getDropdownDisplayText('clothingMaterials', cultureData.clothingMaterials)}
`;
  content += `**Garment Types:** ${getDropdownDisplayText('garmentTypes', cultureData.garmentTypes)}
`;
  content += `**Headwear:** ${getDropdownDisplayText('headwear', cultureData.headwear)}
`;
  content += `**Footwear:** ${getDropdownDisplayText('footwear', cultureData.footwear)}
`;
  content += `**Jewelry & Accessories:** ${getDropdownDisplayText('jewelryAccessories', cultureData.jewelryAccessories)}
`;
  content += `**Hairstyles:** ${getDropdownDisplayText('hairstyles', cultureData.hairstyles)}
`;
  content += `**Body Markings:** ${getDropdownDisplayText('bodyMarkings', cultureData.bodyMarkings)}
`;
  content += `**Scent & Perfume:** ${getDropdownDisplayText('scentPerfume', cultureData.scentPerfume)}

`;

  // Cultural Traditions
  content += `## CULTURAL TRADITIONS
`;
  if (cultureData.traditions.length > 0) {
    cultureData.traditions.forEach((tradition, index) => {
      content += `### ${index + 1}. ${tradition.name}
`;
      content += `${tradition.description}\n\n`;
    });
  } else {
    content += 'No traditions selected\n\n';
  }

  // Example Names
  if (cultureData.exampleNames) {
    content += `## EXAMPLE NAMES
`;
    content += `${cultureData.exampleNames}\n\n`;
  }

  // Culture Biography
  if (cultureData.cultureBiography) {
    content += `## CULTURE BIOGRAPHY
`;
    content += `${cultureData.cultureBiography}\n\n`;
  }

  content += `> Generated on: ${new Date().toLocaleString()}
`;
  content += `> Created with Fantasy Culture Creator
`;

  // Create and download file
  const blob = new Blob([content], {
    type: 'text/plain'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cultureData.name.replace(/[^a-zA-Z0-9]/g, '_')}_Culture.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper function to get display text from dropdown values
function getDropdownDisplayText(dropdownId, value) {
  if (!value) return 'Not specified';

  const dropdown = document.getElementById(`${dropdownId}-dropdown`);
  if (!dropdown) return value;

  const option = dropdown.querySelector(`.dropdown-option[data-value="${value}"]`);
  if (!option) return value;

  const titleElement = option.querySelector('.option-title');
  return titleElement ? titleElement.textContent : value;
}

// Culture Examples
const cultureExamples = {
  'Roman': {
    ethics: ['Militaristic', 'Hierarchical', 'Traditional'],
    heritage: 'hills',
    martialGender: 'male',
    interculturalRelations: 'expansionist',
    legalFoundation: 'scribe',
    knowledgeTransmission: 'written',
    magicStance: 'banned',
    magicType: 'prayer',
    architecture: 'monumental',
    artworks: 'mosaics',
    musicPerformances: 'wind-instruments',
    cuisineDining: 'communal-feasting',
    clothingMaterials: 'animal-fibers',
    garmentTypes: 'tunics',
    headwear: 'headbands-fillets',
    footwear: 'sandals',
    jewelryAccessories: 'signet-rings',
    hairstyles: 'long-hair-braids',
    bodyMarkings: 'none',
    scentPerfume: 'woody-resins',
    traditions: ['Drilled Formations', 'Vineyard Cultivation', 'Codified Laws', 'Siege Craft', 'Imperial Discipline']
  },
  'Egyptian': {
    ethics: ['Spiritual', 'Hierarchical', 'Traditional'],
    heritage: 'riverlands',
    martialGender: 'male',
    interculturalRelations: 'controlled',
    legalFoundation: 'divine',
    knowledgeTransmission: 'pictographs',
    magicStance: 'religious',
    magicType: 'prayer',
    architecture: 'monumental',
    artworks: 'frescoes',
    musicPerformances: 'stringed-instruments',
    cuisineDining: 'ritualistic-dining',
    clothingMaterials: 'plant-fibers',
    garmentTypes: 'draped-cloths',
    headwear: 'wigs',
    footwear: 'sandals',
    jewelryAccessories: 'necklaces-collars',
    hairstyles: 'shaven-heads',
    bodyMarkings: 'none',
    scentPerfume: 'floral-perfumes',
    traditions: ['Temple Bureaucracy', 'Oracle Priesthood', 'Pantheon Worship', 'Scribal Lore', 'Floodplain Farmers']
  },
  'Chinese': {
    ethics: ['Bureaucratic', 'Traditional', 'Communal'],
    heritage: 'riverlands',
    martialGender: 'male',
    interculturalRelations: 'controlled',
    legalFoundation: 'scribe',
    knowledgeTransmission: 'written',
    magicStance: 'accepted',
    magicType: 'mass ritual',
    architecture: 'courtyard',
    artworks: 'pottery',
    musicPerformances: 'stringed-instruments',
    cuisineDining: 'spice-heavy',
    clothingMaterials: 'silk-precursors',
    garmentTypes: 'robes-kaftans',
    headwear: 'wide-brimmed-hats',
    footwear: 'soft-boots-moccasins',
    jewelryAccessories: 'amulets-talismans',
    hairstyles: 'long-hair-braids',
    bodyMarkings: 'none',
    scentPerfume: 'incense',
    traditions: ['Court Eunuchs', 'Ancestor Tablets', 'Ancient Traditions', 'Philosophical Tradition', 'Industrious Labor']
  },
  'Persian': {
    ethics: ['Xenophilic', 'Hierarchical', 'Spiritual'],
    heritage: 'plains',
    martialGender: 'male',
    interculturalRelations: 'expansionist',
    legalFoundation: 'ancestral',
    knowledgeTransmission: 'written',
    magicStance: 'military',
    magicType: 'ash reading',
    architecture: 'monumental',
    artworks: 'textiles',
    musicPerformances: 'vocal-harmonies',
    cuisineDining: 'communal-feasting',
    clothingMaterials: 'animal-fibers',
    garmentTypes: 'breeches-trousers',
    headwear: 'tall-crowns-diadems',
    footwear: 'soft-boots-moccasins',
    jewelryAccessories: 'signet-rings',
    hairstyles: 'beard-cultures',
    bodyMarkings: 'none',
    scentPerfume: 'spice-blends',
    traditions: ['Royal Host', 'Guest Code', 'Caravan Masters', 'Garden Design', 'Master Diplomats']
  }
};

function applyCultureExample(cultureName) {
  saveState();
  const example = cultureExamples[cultureName];
  if (!example) return;

  clearAllOptions();

  document.getElementById('cultureName').value = cultureName;
  generatePluralAdjective();

  // Set Ethics
  example.ethics.forEach(ethicTitle => {
    const ethic = ethosData.find(e => e.title === ethicTitle);
    const ethosBox = document.querySelector(`.ethos-box[data-index="${ethosData.indexOf(ethic)}"]`);
    if (ethic && ethosBox) handleEthicClick(ethic, ethosBox, false);
  });

  // Set Dropdowns
  for (const key in example) {
    if (key === 'ethics' || key === 'traditions') continue;
    const dropdown = document.getElementById(`${key}-dropdown`);
    if (dropdown) {
      selectDropdownOption(dropdown, null, example[key]);
    }
  }

  // Set Traditions
  const allTraditions = traditionData.flatMap(cat => cat.traditions);
  example.traditions.forEach((traditionName, i) => {
    if (i < 5) {
      const tradition = allTraditions.find(t => t.name === traditionName);
      if (tradition) selectedTraditions[i] = tradition;
    }
  });
  updateTraditionSlots();
  updateTraditionAvailability();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
