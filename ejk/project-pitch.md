# Visualizing Bangladesh’s Extrajudicial Killings Statistics

###### Nazmul Ahasan
nazmul@berkeley.edu

## Background

Located in South Asia, Bangladesh has been no stranger to government excess and human rights violations since its founding in 1971 through a bloody war of independence. But since the Bangladesh Awami League party returned to power in 2009, the country has seen a disturbing trend of rising extrajudicial executions, among other rights violations, by security forces. Over the last 13 years, law enforcement agencies and security forces, notably a notorious police unit called Rapid Action Battalion (RAB), have allegedly executed more than two thousand people — ranging from alleged criminals, drug peddlers, and militants to members of the opposition parties and even Rohingya refugees from neighboring Myanmar.

The longstanding impunity for Bangladesh’s security forces ended in December 2021, when the United States government imposed economic sanctions and travel ban on current and former senior leaders of RAB. No other U.S. administration has sanctioned any Bangladeshi entity or individual. In its [press release](https://home.treasury.gov/news/press-releases/jy0526) announcing the sanctions, the U.S. Department of Treasury noted that since 2018, RAB and other forces were responsible for at least 600 extrajudicial killings, citing NGOs and human rights organizations.

However, the Bangladesh government strongly contests the assertion. It challenges the number of those allegedly killed by security forces beyond any judicial purview and has since sought to discredit rights bodies that documented the abuses. In recent months, the government has [proceed with canceling the registration](https://www.newagebd.net/article/179965/pmo-upholds-odhikar-deregistration) of one of the most prominent Bangladeshi rights groups, *Odhikar*, for publishing "misleading information about various extrajudicial killings [and] alleged disappearances" on its website. 

A source within *Odhikar* has recently leaked to me its compilation of extrajudicial incidents in Bangladesh. The database contains identifiable details of more than 2,000 individuals who, according to news reports, were killed by Bangladeshi security forces.

## Data

The dataset contains [14 .xls files](https://github.com/j221-dataviz/nazmul-ahasan/tree/main/data/ejk/xls), each of which refers to a yearly dataset beginning from 2009. Each yearly file includes the names of subjects killed, the date of the killings, the locations where the killings took place, security forces and their units that allegedly carried out the killings, and other useful details.

With an R script, Peter Aldhous merged the datasets into one. The merged spreadsheet contains more than 2,000 rows, each denoting an incident in which one or multiple individuals were killed.

The resultant spreadsheet needs to be cleaned manually as columns appear inconsistent. *(For example, in initial datasets, the names and ages of the individuals were together in a single column, but in other datasets, they were in separate columns.)*

## Questions

After cleaning, the dataset can be analyzed to answer key questions that are as follows: 

* Which security unit carried out the most killings?
* Where did most killings take place?
* What were the oft-cited political, professional or other identities of the subjects?
* Were there any periods (e.g., elections) when killings particularly peaked?

## Visualization

While Bangladeshis aren’t unfamiliar with the figures and statistics related to the extrajudicial killings, it’s crucial to humanizing the victims. One way of doing that would be to have a database or table that will enable people to search and will contain the names, ages and other details of the victims. 

A map based on the location of the killings could be helpful to visualize where most executions took place, with different colors used to refer to different forces or units. The map can contain a heatmap based on the number of killings that took place in sub-districts. The map can be compared by years that the audience can switch to. 

A time-series bar chart can show periods or years when such incidents peaked.

A visual word cloud can give the audience a perspective into the different identities of people killed.