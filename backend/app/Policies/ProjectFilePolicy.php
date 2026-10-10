<?php

namespace App\Policies;

/** A company works only with its own ProjectFile records (CompanyOwnedPolicy). */
class ProjectFilePolicy extends CompanyOwnedPolicy {}
