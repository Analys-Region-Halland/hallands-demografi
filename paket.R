# paket.R - Automatisk installation och laddning av R-paket
# Denna fil hanterar alla paket som behövs för projektet

# Lista över paket som behövs
paket <- c(
  "ggplot2",
  "dplyr", 
  "tidyr",
  "scales",
  "ggrepel",
  "tidyverse",
  "ggtext",
  "lubridate",
  "zoo",
  "ggiraph",
  'pxweb', 
  'writexl', 
  'openxlsx', 
  "patchwork",
  "cowplot",
  "ggridges",
  'viridis')


# Funktion för att installera och ladda paket
ladda_paket <- function(paket_lista) {
  # Kontrollera vilka paket som saknas
  saknade_paket <- paket_lista[!(paket_lista %in% installed.packages()[,"Package"])]
  
  # Installera saknade paket
  if(length(saknade_paket) > 0) {
    message("Installerar följande paket: ", paste(saknade_paket, collapse = ", "))
    install.packages(saknade_paket, repos = "https://cloud.r-project.org")
  }
  
  # Ladda alla paket
  for(p in paket_lista) {
    suppressPackageStartupMessages(library(p, character.only = TRUE))
  }
  
  message("Alla paket laddade!")
}

# Kör funktionen
ladda_paket(paket)

# Sätt svenska lokala inställningar
Sys.setlocale("LC_TIME", "sv_SE.UTF-8")